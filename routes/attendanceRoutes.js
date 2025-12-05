const express = require("express");
const Attendance = require("../models/Attendance");
const User = require("../models/User"); // ✅ Needed to look up by roll number
const auth = require("../middlewares/authMiddleware");

const router = express.Router();

// Teacher marks attendance
router.post("/mark", auth(["teacher"]), async (req, res) => {
  try {
    const { rollNumber, date, status } = req.body; // ✅ Changed to rollNumber

    // Find the student by roll number
    const student = await User.findOne({ rollNumber, role: "student" });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Get today's date in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0];
    const requestDate = new Date(date).toISOString().split("T")[0];

    // Check if the date is today
    if (requestDate !== today) {
      return res.status(400).json({
        error: "You can only mark attendance for the current day."
      });
    }

    // Check if Attendance already exits for the student todays

    const existing = await Attendance.findOne({
      studentId : student._id,
      date : today
    })

    if(existing){
      return res.status(400).json({
        error: "Attendance already marked for today."
      })
    }

    // Save attendance record
    
    const attendance = new Attendance({
      studentId: student._id, // ✅ Store ObjectId after lookup
      date: today,
      status,
      markedBy: req.user.id
    });

    await attendance.save();
    res.json({ message: "Attendance marked successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Student views their attendance by roll number
router.get("/student/roll/:rollNumber", auth(["student", "teacher", "hod"]), async (req, res) => {
  try {
    // Find the student by roll number
    const student = await User.findOne({ rollNumber: req.params.rollNumber, role: "student" });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Fetch attendance records by studentId (ObjectId)
    const records = await Attendance.find({ studentId: student._id });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// HOD views stats
router.get("/stats", auth(["hod"]), async (req, res) => {
  try {
    const stats = await Attendance.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Teacher views attendance they have marked (with filters)
router.get("/teacher/report", auth(["teacher"]), async (req, res) => {
  try {
    const { date, className, subject } = req.query;
    let filter = { markedBy: req.user.id };

    // filter by date
    if (date) {
      const selectedDate = new Date(date);
      selectedDate.setHours(0, 0, 0, 0);

      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);

      filter.date = { $gte: selectedDate, $lt: nextDay };
    }

    // filter by class
    if (className) filter.className = className;

    // filter by subject
    if (subject) filter.subject = subject;

    const records = await Attendance.find(filter)
      .populate("studentId", "name rollNumber")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
