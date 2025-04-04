const express = require('express');
const router = express.Router();
const FormTemplate = require('../../models/FormTemplate');
const { isClientAuthenticated, isAdmin } = require('../../middleware/clientTrackerAuthMiddleware');

// POST /api/client-tracker/form-templates - Create a new template
router.post('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, fields } = req.body;
    const template = new FormTemplate({ name, fields });
    await template.save();
    res.status(201).json({ data: template });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/client-tracker/form-templates - Fetch all templates
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const templates = await FormTemplate.find();
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/client-tracker/form-templates/:id - Edit a template
router.put('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, fields } = req.body;
    const template = await FormTemplate.findByIdAndUpdate(
      req.params.id,
      { name, fields },
      { new: true }
    );
    if (!template) return res.status(404).json({ message: 'Template not found' });
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;