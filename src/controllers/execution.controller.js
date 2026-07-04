import * as executionService from '../services/execution.service.js'

/** POST /api/v1/execute — body: { language, code, stdin? } */
export const execute = async (req, res) => {
  const result = await executionService.execute(req.body)
  res.json({ success: true, data: result })
}
