import { User } from '../models/User.model.js'
import { Course } from '../models/Course.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { Comment } from '../models/Comment.model.js'
import { Activity } from '../models/Activity.model.js'
import { ApiError } from '../utils/ApiError.js'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Platform-wide headline stats — matches PLATFORM_STATS shape. */
export const getStats = async () => {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [totalStudents, publishedCourses, newSignupsThisMonth, activeSubscriptions, revenueAgg, ratingAgg] =
    await Promise.all([
      User.countDocuments({ role: 'learner' }),
      Course.countDocuments({ status: 'published' }),
      User.countDocuments({ role: 'learner', createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ role: 'learner', plan: { $ne: 'Free' }, status: 'active' }),
      Course.aggregate([{ $group: { _id: null, total: { $sum: '$revenue' } } }]),
      Course.aggregate([
        { $match: { status: 'published', rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
    ])

  return {
    totalStudents,
    totalRevenue: revenueAgg[0]?.total ?? 0,
    publishedCourses,
    newSignupsThisMonth,
    activeSubscriptions,
    avgRating: Number((ratingAgg[0]?.avg ?? 0).toFixed(2)),
  }
}

/** Monthly revenue + new student counts for the last 12 months — admin analytics chart. */
export const getMonthlyRevenue = async () => {
  const since = new Date()
  since.setMonth(since.getMonth() - 11)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const enrollments = await Enrollment.find({ createdAt: { $gte: since } }).populate(
    'course',
    'price'
  )

  const buckets = new Map()
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.set(key, { month: MONTH_LABELS[d.getMonth()], revenue: 0, students: 0 })
  }
  for (const e of enrollments) {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, '0')}`
    const bucket = buckets.get(key)
    if (bucket) {
      bucket.revenue += e.course?.price ?? 0
      bucket.students += 1
    }
  }

  return [...buckets.values()]
}

/** Paginated student list — matches AdminStudent shape. */
export const listStudents = async (query = {}) => {
  const { q, status, plan } = query
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 25))

  const filter = { role: 'learner' }
  if (status) filter.status = status
  if (plan) filter.plan = plan
  if (q) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }]
  }

  const [students, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
  ])

  // Course counts in one query instead of N
  const counts = await Enrollment.aggregate([
    { $match: { user: { $in: students.map((s) => s._id) } } },
    { $group: { _id: '$user', count: { $sum: 1 } } },
  ])
  const countByUser = new Map(counts.map((c) => [c._id.toString(), c.count]))

  return {
    students: students.map((s) => ({
      id: s._id.toString(),
      name: s.name,
      email: s.email,
      joined: s.createdAt.toISOString().slice(0, 10),
      courses: countByUser.get(s._id.toString()) ?? 0,
      xp: s.xp,
      plan: s.plan,
      status: s.status,
      lastActive: s.lastActiveDate ? s.lastActiveDate.toISOString().slice(0, 10) : null,
    })),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  }
}

/** Ban / reactivate / change plan or role. */
export const updateStudent = async (studentId, updates) => {
  const user = await User.findById(studentId)
  if (!user) throw new ApiError(404, 'User not found')
  if (user.role === 'admin' && updates.status === 'banned') {
    throw new ApiError(403, 'Admins cannot be banned')
  }

  const wasUpgrade = updates.plan && updates.plan !== 'Free' && user.plan === 'Free'
  Object.assign(user, updates)
  await user.save()

  if (wasUpgrade) Activity.log('upgrade', `${user.name} upgraded to ${user.plan}`, user._id)

  return user.toPublic()
}

/** All courses regardless of status — matches AdminCourse shape. */
export const listAllCourses = async () => {
  const courses = await Course.find()
    .sort({ updatedAt: -1 })
    .populate('instructor', 'name')

  return courses.map((c) => ({
    id: c._id.toString(),
    title: c.title,
    category: c.category,
    instructor: c.instructor?.name ?? '',
    students: c.students,
    revenue: c.revenue,
    rating: c.rating,
    status: c.status,
    lastUpdated: c.updatedAt.toISOString().slice(0, 10),
    gradient: c.gradient,
  }))
}

/** Comment moderation queue — matches ModComment shape. */
export const listComments = async (status) => {
  const filter = status ? { status } : {}
  const comments = await Comment.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('author', 'name email')
    .populate('course', 'title')

  return comments.map((c) => c.toModeration())
}

export const moderateComment = async (commentId, status) => {
  const comment = await Comment.findById(commentId)
    .populate('author', 'name email')
    .populate('course', 'title')
  if (!comment) throw new ApiError(404, 'Comment not found')

  comment.status = status
  await comment.save()
  return comment.toModeration()
}

export const getActivityFeed = async (limit = 20) => {
  const activities = await Activity.find().sort({ createdAt: -1 }).limit(limit)
  return activities.map((a) => a.toPublic())
}
