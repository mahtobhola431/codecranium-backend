import mongoose from 'mongoose'

/**
 * Lessons and sections are embedded in the course document — they are always
 * read together with the course and never queried independently.
 * Shapes match the frontend's Lesson / LessonSection interfaces.
 */
const lessonSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    duration: { type: Number, default: 0 }, // minutes
    type: {
      type: String,
      enum: ['video', 'article', 'quiz', 'challenge'],
      default: 'article',
    },
    isPreview: { type: Boolean, default: false },
    codeLanguage: {
      type: String,
      enum: ['javascript', 'typescript', 'python', 'rust', 'go', 'bash'],
    },
    content: { type: String, default: '' },
    starterCode: { type: String, default: '' },
  },
  { _id: true }
)

const sectionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    lessons: [lessonSchema],
  },
  { _id: true }
)

const courseSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and hyphens'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    description: { type: String, required: [true, 'Description is required'], maxlength: 300 },
    longDescription: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['javascript', 'react', 'python', 'typescript', 'nodejs', 'css', 'rust', 'go'],
    },
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    duration: { type: Number, default: 0 }, // total minutes
    price: { type: Number, default: 0, min: 0 },
    gradient: { type: String, default: 'from-blue-500 to-indigo-500' },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
      index: true,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    whatYouLearn: [{ type: String, trim: true }],
    sections: [sectionSchema],
    codeLanguage: {
      type: String,
      enum: ['javascript', 'typescript', 'python', 'rust', 'go', 'bash'],
      default: 'javascript',
    },
    // Publishing lifecycle — matches admin CourseStatus
    status: {
      type: String,
      enum: ['published', 'draft', 'archived'],
      default: 'draft',
      index: true,
    },
    // Denormalised counters — updated by enrollment / review services
    students: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { timestamps: true }
)

// Text-ish search across the catalog (GET /courses?q=...)
courseSchema.index({ title: 'text', description: 'text', tags: 'text' })

/** All lessons of the course flattened, in section order. */
courseSchema.methods.allLessons = function () {
  return this.sections.flatMap((s) => s.lessons)
}

courseSchema.methods.findLessonBySlug = function (lessonSlug) {
  for (const section of this.sections) {
    const lesson = section.lessons.find((l) => l.slug === lessonSlug)
    if (lesson) return lesson
  }
  return null
}

const shapeLesson = (l, { includeContent = false } = {}) => ({
  id: l._id.toString(),
  slug: l.slug,
  title: l.title,
  duration: l.duration,
  type: l.type,
  isPreview: l.isPreview,
  ...(l.codeLanguage ? { codeLanguage: l.codeLanguage } : {}),
  ...(includeContent ? { content: l.content, starterCode: l.starterCode } : {}),
})

/**
 * Card shape — used in catalog lists. No sections, no lesson content.
 * Requires instructor to be populated.
 */
courseSchema.methods.toCard = function () {
  const inst = this.instructor
  return {
    id: this._id.toString(),
    slug: this.slug,
    title: this.title,
    description: this.description,
    category: this.category,
    difficulty: this.difficulty,
    duration: this.duration,
    lessonCount: this.allLessons().length,
    rating: this.rating,
    reviewCount: this.reviewCount,
    students: this.students,
    price: this.price,
    gradient: this.gradient,
    tags: this.tags,
    codeLanguage: this.codeLanguage,
    lastUpdated: this.updatedAt.toISOString().slice(0, 10),
    instructor:
      inst && inst.name
        ? { id: inst._id.toString(), name: inst.name, avatar: inst.avatar, bio: inst.bio }
        : undefined,
  }
}

/**
 * Full shape — matches the frontend Course interface.
 * Lesson content/starterCode are omitted here; they're fetched per-lesson
 * (and gated on enrollment) via GET /courses/:slug/lessons/:lessonSlug.
 */
courseSchema.methods.toPublic = function () {
  return {
    ...this.toCard(),
    longDescription: this.longDescription,
    whatYouLearn: this.whatYouLearn,
    status: this.status,
    sections: this.sections.map((s) => ({
      id: s._id.toString(),
      title: s.title,
      lessons: s.lessons.map((l) => shapeLesson(l)),
    })),
  }
}

courseSchema.statics.shapeLesson = shapeLesson

export const Course = mongoose.model('Course', courseSchema)
