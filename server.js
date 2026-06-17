import 'dotenv/config'
import app from './app.js'
import { connectDB } from './src/config/db.js'
import { env } from './src/config/env.js'

const start = async () => {
  await connectDB()

  app.listen(env.PORT, () => {
    console.log(`🚀  Server running on http://localhost:${env.PORT} [${env.NODE_ENV}]`)
    console.log(`📡  Auth routes: http://localhost:${env.PORT}/api/v1/auth`)
  })
}

start()