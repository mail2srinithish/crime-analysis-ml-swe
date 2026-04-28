const complaintModel = require('../models/complaint');
const axios = require('axios');

const createComplaint = async (req,res) => {
    // Determine AI Priority via NLP Model
    let aiCategory = "Unclassified";
    let aiPriority = "MEDIUM";
    try {
        const mlResponse = await axios.post(`${process.env.FLASK_SERVER || 'http://localhost:5001'}/api/ml/classify-complaint`, {
            text: req.body.complaint
        });
        if (mlResponse.data && mlResponse.data.priority) {
            aiCategory = mlResponse.data.category;
            aiPriority = mlResponse.data.priority;
        }
    } catch (mlErr) {
        console.error("AI Error:", mlErr.message);
    }

    const newComplaint = new complaintModel({
        fullName: req.body.fullName,
        email: req.body.email,
        crimeDate: req.body.crimeDate,
        district: req.body.district,
        address: req.body.address,
        complaintType: req.body.complaintType,
        complaint: req.body.complaint,
        aiCategory: aiCategory,
        aiPriority: aiPriority
    });

    try{
        await newComplaint.save();
        return res.redirect('/');
    } catch(err) {
        console.log(err);
        res.status(500).json({message: "Something went wrong"});
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
    deleteComplaint,
    getComplaint
};