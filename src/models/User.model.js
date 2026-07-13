import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      // Google accounts have no password — only require one for local signups
      required: [
        function () {
          return this.authProvider === 'local'
        },
        'Password is required',
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // never returned in queries unless explicitly asked
    },
    // How the account signs in. 'google' accounts have a googleId and no password.
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    // Google's stable subject ID ('sub' claim). sparse so the unique index
    // ignores the many local accounts where this is absent.
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['learner', 'instructor', 'admin'],
      default: 'learner',
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    // Subscription plan — matches frontend AdminStudent.plan
    plan: {
      type: String,
      enum: ['Free', 'Pro', 'Team'],
      default: 'Free',
    },
    // Account status — admins can ban/deactivate (frontend AdminStudent.status)
    status: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    // Instructor-only: where monthly payouts are sent
    payoutAccount: {
      type: String,
      default: '',
    },
    // Gamification — matches frontend User interface exactly
    xp: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastActiveDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt, updatedAt automatically
  }
)

// Hash password before saving — only runs if the password field was modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

/**
 * Instance method — compare a plain-text candidate against the stored hash.
 * Called in auth.service.js during login.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // Google-only accounts have no hash to compare against — bcrypt.compare would
  // throw on an undefined hash, so fail the check cleanly instead.
  if (!this.password) return false
  return bcrypt.compare(candidatePassword, this.password)
}

/**
 * toPublic() — strips sensitive fields and shapes the object to match
 * the frontend's User interface exactly:
 * { id, name, email, avatar, xp, streak, joinedAt }
 *
 * This is what gets returned in every auth response.
 */
userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    role: this.role, // extra field — lets the frontend route to /admin or /instructor
    bio: this.bio,
    plan: this.plan,
    authProvider: this.authProvider, // lets the UI hide "change password" for Google accounts
    xp: this.xp,
    streak: this.streak,
    joinedAt: this.createdAt.toISOString(),
  }
}

export const User = mongoose.model('User', userSchema)