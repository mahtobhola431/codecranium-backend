/**
 * Seeds the database with the catalog the frontend was designed around.
 *
 *   npm run seed
 *
 * ⚠️  Destructive: wipes Users, Courses, LearningPaths, Comments,
 *     Enrollments, Certificates, Payouts and Activity first.
 *
 * Seeded logins:
 *   admin@codecranium.com  / admin123    (admin)
 *   sarah@codecranium.com  / sarah123    (instructor)
 *   marcus@codecranium.com / marcus123   (instructor)
 *   alex@example.com       / learner123  (learner — plus several others)
 */
import 'dotenv/config'
import mongoose from 'mongoose'

import { env } from '../config/env.js'
import { User } from '../models/User.model.js'
import { Course } from '../models/Course.model.js'
import { LearningPath } from '../models/LearningPath.model.js'
import { Comment } from '../models/Comment.model.js'
import { Enrollment } from '../models/Enrollment.model.js'
import { Certificate } from '../models/Certificate.model.js'
import { Payout } from '../models/Payout.model.js'
import { Activity } from '../models/Activity.model.js'
import { SEED_USERS, SEED_COURSES, SEED_LEARNING_PATHS, SEED_COMMENTS } from './data.js'

const seed = async () => {
  await mongoose.connect(env.MONGODB_URI)
  console.log('✅  Connected — seeding database…')

  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    LearningPath.deleteMany({}),
    Comment.deleteMany({}),
    Enrollment.deleteMany({}),
    Certificate.deleteMany({}),
    Payout.deleteMany({}),
    Activity.deleteMany({}),
  ])
  console.log('🧹  Cleared existing collections')

  // Users — create() one by one so the password pre-save hook hashes each
  const users = {}
  for (const data of SEED_USERS) {
    const user = await User.create(data)
    users[user.email] = user
  }
  console.log(`👤  ${SEED_USERS.length} users`)

  // Courses — resolve instructor emails, publish everything, derive revenue
  const courses = {}
  for (const data of SEED_COURSES) {
    const { instructorEmail, ...courseData } = data
    const course = await Course.create({
      ...courseData,
      instructor: users[instructorEmail]._id,
      status: 'published',
      revenue: courseData.price > 0 ? Math.round(courseData.students * courseData.price * 0.1) : 0,
    })
    courses[course.slug] = course
  }
  console.log(`📚  ${SEED_COURSES.length} courses`)

  // Learning paths
  for (const data of SEED_LEARNING_PATHS) {
    const { courseSlugs, ...pathData } = data
    await LearningPath.create({
      ...pathData,
      courses: courseSlugs.map((slug) => courses[slug]._id),
    })
  }
  console.log(`🗺️   ${SEED_LEARNING_PATHS.length} learning paths`)

  // Comments (+ replies)
  let commentCount = 0
  for (const data of SEED_COMMENTS) {
    const { authorEmail, courseSlug, replies = [], ...commentData } = data
    const parent = await Comment.create({
      ...commentData,
      author: users[authorEmail]._id,
      course: courses[courseSlug]._id,
    })
    commentCount++
    for (const reply of replies) {
      await Comment.create({
        course: parent.course,
        lessonSlug: parent.lessonSlug,
        author: users[reply.authorEmail]._id,
        content: reply.content,
        parent: parent._id,
        status: 'approved',
      })
      commentCount++
    }
  }
  console.log(`💬  ${commentCount} comments`)

  // A few enrollments so dashboards aren't empty
  const sampleEnrollments = [
    { email: 'alex@example.com', slug: 'react-mastery', done: 3, last: 'use-effect-mastery' },
    { email: 'alex@example.com', slug: 'javascript-fundamentals', done: 9, last: 'async-await' }, // completed
    { email: 'jamie@devmail.io', slug: 'typescript-deep-dive', done: 1, last: 'why-typescript' },
    { email: 'lena@company.de', slug: 'react-mastery', done: 5, last: 'custom-hooks' }, // completed
    { email: 'carlos@mx.dev', slug: 'go-backend', done: 1, last: 'go-tour' },
  ]
  for (const { email, slug, done, last } of sampleEnrollments) {
    const course = courses[slug]
    const lessons = course.allLessons()
    const completedLessons = lessons.slice(0, done).map((l) => l._id.toString())
    const completedAt = done >= lessons.length ? new Date() : null
    await Enrollment.create({
      user: users[email]._id,
      course: course._id,
      completedLessons,
      lastLessonSlug: last,
      completedAt,
    })
    if (completedAt) {
      await Certificate.create({
        user: users[email]._id,
        course: course._id,
        courseTitle: course.title,
      })
    }
  }
  console.log(`🎓  ${sampleEnrollments.length} enrollments`)

  // Payout history for Sarah (matches the instructor revenue page)
  const sarah = users['sarah@codecranium.com']
  const payouts = [
    { month: '2026-05', amount: 5100 },
    { month: '2026-04', amount: 4200 },
    { month: '2026-03', amount: 3600 },
    { month: '2026-02', amount: 3200 },
    { month: '2026-01', amount: 2800 },
  ]
  for (const p of payouts) {
    const [y, m] = p.month.split('-').map(Number)
    await Payout.create({
      instructor: sarah._id,
      ...p,
      status: 'paid',
      paidOn: new Date(y, m, 1), // paid on the 1st of the following month
    })
  }
  console.log(`💸  ${payouts.length} payouts`)

  // Activity feed entries
  await Activity.create([
    { type: 'signup', text: 'Alex Rivera signed up (Pro plan)', user: users['alex@example.com']._id },
    { type: 'enroll', text: 'Alex Rivera enrolled in React Mastery', user: users['alex@example.com']._id },
    { type: 'complete', text: 'Lena Fischer completed React Mastery', user: users['lena@company.de']._id },
    { type: 'upgrade', text: 'Jamie Wu upgraded to Pro', user: users['jamie@devmail.io']._id },
    { type: 'flag', text: 'Comment flagged in JavaScript Fundamentals', user: users['viktor@ru.dev']._id },
  ])
  console.log('📰  Activity feed')

  console.log('\n🌱  Seed complete!\n')
  console.log('   Logins:')
  console.log('   admin@codecranium.com  / admin123    (admin)')
  console.log('   sarah@codecranium.com  / sarah123    (instructor)')
  console.log('   marcus@codecranium.com / marcus123   (instructor)')
  console.log('   alex@example.com       / learner123  (learner)')

  await mongoose.disconnect()
  process.exit(0)
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})
