import * as learningPathService from '../services/learningPath.service.js'

/** GET /api/v1/learning-paths */
export const listPaths = async (req, res) => {
  const paths = await learningPathService.listPaths()
  res.json({ success: true, data: { paths } })
}

/** GET /api/v1/learning-paths/:slug — includes full course cards */
export const getPath = async (req, res) => {
  const path = await learningPathService.getPathBySlug(req.params.slug)
  res.json({ success: true, data: { path } })
}
