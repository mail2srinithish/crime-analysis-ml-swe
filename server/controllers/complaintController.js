const complaintModel = require('../models/complaint');
const axios = require('axios');

const createComplaint = async (req, res) => {
    // AI Priority Classification via Flask NLP model
    let aiCategory = 'Unclassified';
    let aiPriority = 'MEDIUM';
    try {
        const mlResponse = await axios.post(
            `${process.env.FLASK_SERVER || 'http://localhost:5001'}/api/ml/classify-complaint`,
            { text: req.body.complaint },
            { timeout: 5000 }
        );
        if (mlResponse.data && mlResponse.data.priority) {
            aiCategory = mlResponse.data.category || 'Unclassified';
            aiPriority = mlResponse.data.priority;
        }
    } catch (mlErr) {
        // Flask offline — use rule-based fallback based on complaint type
        const typeMap = {
            murder: 'CRITICAL', robbery: 'HIGH', kidnapping: 'CRITICAL',
            assault: 'HIGH', humantrafficking: 'CRITICAL', cybercrime: 'MEDIUM',
            dowry: 'HIGH', blackmailing: 'HIGH', theft: 'LOW', fakenews: 'LOW'
        };
        aiPriority = typeMap[req.body.complaintType] || 'MEDIUM';
        aiCategory = req.body.complaintType || 'Other';
    }

    // Generate unique reference number: CRP-YYYY-NNNNN
    const year = new Date().getFullYear();
    const count = await complaintModel.count();
    const refNumber = `CRP-${year}-${String(count + 1).padStart(5, '0')}`;

    const newComplaint = new complaintModel({
        refNumber,
        fullName: req.body.fullName,
        email: req.body.email,
        crimeDate: req.body.crimeDate,
        state: req.body.state || '',
        district: req.body.district,
        address: req.body.address,
        complaintType: req.body.complaintType,
        complaint: req.body.complaint,
        aiCategory,
        aiPriority,
        status: 'Pending'
    });

    try {
        await newComplaint.save();
        req.flash('success', `Report filed successfully! Your reference number is <strong>${refNumber}</strong>. Keep this for tracking.`);
        return res.redirect('/crime');
    } catch (err) {
        console.log(err);
        req.flash('error', 'Something went wrong. Please try again.');
        return res.redirect('/complaint');
    }
}

const updateStatus = async (req, res) => {
    const { id } = req.params;
    const { status, officerNote } = req.body;
    try {
        await complaintModel.update({ status, officerNote: officerNote || '' }, { where: { id } });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
}

const updateComplaint = async(req,res) => {
    const id = req.params.id;
    const {fullName, crimeDate, district, address, complaintType, complaint} = req.body;
    const newComplaint = {
        fullName: fullName,
        email: email,
        crimeDate: crimeDate,
        district: district,
        address: address,
        complaintType: complaintType,
        complaint: complaint
    }
    try{
        await complaintModel.update(newComplaint, { where: { id: id } });
        return res.redirect('/');
    } catch(err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});

    }
}

const deleteComplaint = async(req,res) => {
    const id = req.params.id;
    try{
        await complaintModel.destroy({ where: { id: id } });
        res.status(202).json({ message: "Deleted" });
    } catch(err){
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
}

const getComplaint = async(req,res) => {
    try{
        const complaint = await complaintModel.findAll();
        res.json(complaint);
    } catch(err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
    }
}

module.exports = {
    createComplaint,
    updateComplaint,
    updateStatus,
    deleteComplaint,
    getComplaint
};