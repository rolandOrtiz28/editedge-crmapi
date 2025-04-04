const express = require('express');
const router = express.Router();
const Client = require('../../models/Client');
const FormTemplate = require('../../models/FormTemplate');
const { isClientAuthenticated, isAdmin, isClient } = require('../../middleware/clientTrackerAuthMiddleware');

// GET /api/client-tracker/clients - Fetch all clients (admin only)
router.get('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Fetching all clients...");
    const clients = await Client.find();
    console.log("🔍 Fetched clients:", clients);
    res.json({ data: clients });
  } catch (err) {
    console.error("❌ Error fetching all clients:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/client-tracker/clients/:id - Fetch a client by ID (admin or client)
router.get('/:id', isClientAuthenticated, async (req, res) => {
  try {
    console.log("🔍 Fetching client by ID:", req.params.id);
    const client = await Client.findById(req.params.id);
    if (!client) {
      console.log("❌ Client not found:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }

    // If the user is a client, ensure they can only access their own data
    if (req.client) {
      console.log("🔍 Client authenticated, checking access:", req.client._id);
      if (client._id.toString() !== req.client._id.toString()) {
        console.log("❌ Client access denied: Can only access own data");
        return res.status(403).json({ message: 'Forbidden: You can only access your own data' });
      }
    } else if (!req.user || req.user.role !== 'admin') {
      console.log("❌ Admin access required:", req.user);
      return res.status(403).json({ message: 'Forbidden: Admin access only' });
    }

    console.log("🔍 Client fetched successfully:", client);
    res.json({ data: client });
  } catch (err) {
    console.error("❌ Error fetching client by ID:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/client-tracker/clients - Add a new client (admin only)
router.post('/', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Adding new client with data:", req.body);
    const { name, email, password, industry, contact, phone, status, assignedTo } = req.body;

    const defaultSteps = [
      { label: 'Initial Consultation', completed: true, date: '2023-10-01' },
      { label: 'Proposal Submission', completed: false, date: 'Pending' },
      { label: 'Contract Signing', completed: false, date: 'Pending' },
      { label: 'Project Kickoff', completed: false, date: 'Pending' },
    ];

    const newClient = new Client({
      name,
      email,
      password,
      industry,
      contact,
      phone,
      status: status || 'Active',
      assignedTo,
      role: 'client', // Explicitly set the role
      onboardingSteps: defaultSteps,
    });

    console.log("🔍 New client object before save:", newClient);
    await newClient.save();
    console.log("🔍 New client saved successfully:", newClient);
    res.status(201).json({ data: newClient });
  } catch (err) {
    console.error("❌ Error adding new client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/client-tracker/clients/:id - Update a client (admin only)
router.put('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Updating client ID:", req.params.id, "with updates:", req.body);
    const updates = req.body;
    const client = await Client.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!client) {
      console.log("❌ Client not found for update:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }
    console.log("🔍 Client updated successfully:", client);
    res.json({ data: client });
  } catch (err) {
    console.error("❌ Error updating client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/client-tracker/clients/:id - Delete a client (admin only)
router.delete('/:id', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    console.log("🔍 Deleting client ID:", req.params.id);
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      console.log("❌ Client not found for deletion:", req.params.id);
      return res.status(404).json({ message: 'Client not found' });
    }
    console.log("🔍 Client deleted successfully:", client);
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    console.error("❌ Error deleting client:", err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PATCH /api/client-tracker/clients/:id/onboarding
router.patch('/:id/onboarding', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const { stepLabel, completed, date } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });

    const step = client.onboardingSteps.find((s) => s.label === stepLabel);
    if (!step) return res.status(404).json({ message: 'Step not found' });

    step.completed = completed;
    step.date = date;

    await client.save();
    res.json({ message: 'Step updated', data: client.onboardingSteps });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// FORMTEMPLATE:
router.post('/:id/assign-form-template', isClientAuthenticated, isAdmin, async (req, res) => {
  try {
    const { templateId, customFields } = req.body;
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: 'Client not found' });
    
    const template = await FormTemplate.findById(templateId);
    if (!template) return res.status(404).json({ message: 'Template not found' });

    client.assignedFormTemplate = { templateId, customFields: customFields || template.fields };
    await client.save();
    res.json({ data: client });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/client-tracker/clients/:id/initial-consultation - Client submits form
router.post('/:id/initial-consultation', isClientAuthenticated, async (req, res) => {
  try {
    const client = await Client.findById(req.params.id).populate('assignedFormTemplate.templateId');
    if (!client) return res.status(404).json({ message: 'Client not found' });

    // Check if Initial Consultation is active
    const initialStep = client.onboardingSteps.find(step => step.label === 'Initial Consultation');
    if (!initialStep || initialStep.completed) {
      return res.status(403).json({ message: 'Form only available during Initial Consultation' });
    }

    // Ensure client can only submit their own form
    if (req.client && client._id.toString() !== req.client._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You can only submit your own form' });
    }

    const formFields = client.assignedFormTemplate.customFields;
    const responses = req.body; // { "label1": "value1", "label2": "value2" }

    // Validate required fields
    for (const field of formFields) {
      if (field.required && (!responses[field.label] || responses[field.label].trim() === '')) {
        return res.status(400).json({ message: `Missing required field: ${field.label}` });
      }
    }

    client.consultationFormResponses = new Map(Object.entries(responses));
    await client.save();
    res.status(200).json({ message: 'Form submitted successfully', data: client });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;