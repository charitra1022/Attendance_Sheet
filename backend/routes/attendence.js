const express = require('express');
const router = express.Router();

// database connection
const config = require('../conn')
const connection = config.connection

// bcryptjs package for password hashing and encryption
const bcrypt = require('bcryptjs');

// import validators
const { body, validationResult } = require('express-validator');

// JSON Web Token to generate unique Token for user
const jwt = require('jsonwebtoken');
const fetchuser = require('../middleware/fetchuser');
// Signature Key
const AUTH_KEY = "MYNameISRahul@6820";


// api for getting the attendence details of particular student in particular subject
router.get("/attendence", fetchuser,
    [
        body("subject_code", "Enter subject code of length 7").isLength({ min: 7, max: 7 })
    ],
    async (req, res) => {
        // check for errors in input
        const errors = validationResult(req.query);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { subject_code } = req.query
        const { student_id } = req.user

        let sql = `select student_id, subject_code, teacher_id, date, present from attendance_tb where subject_code='${subject_code}' and student_id=${student_id}`
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err.sqlMessage)
                res.send({ success: false, err })
                return
            }

            if (result) {
                res.send({ success: true, result })
                return
            }
        })
    })


// api for adding the attendence of the students
// headers: {
//      auth-token, subject_code, date
// }
// body: list of students
router.post("/add-attendence", fetchuser,
    [
        body("teacher_id", "enter valid teacher id").isNumeric()
    ],
    async (req, res) => {
        // check for errors in input
        const errors = validationResult(req.user);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { students } = req.body
        const { teacher_id } = req.user
        const { subject_code, date } = req.headers
        let sql = `insert into attendance_tb(student_id, subject_code, teacher_id, date, present) values`

        for (let i = 0; i < students.length; i++) {
            const { student_id, present } = students[i]
            sql += `(${student_id}, '${subject_code}', ${teacher_id}, '${date}', ${present})`
            if (i != students.length - 1) sql += ", "
        }

        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err.sqlMessage)
                res.send({ success: false, err })
            }

            if (result) {
                console.log(result)
                res.send({ success: true, msg: "attendence added successfully" })
            }

        })
    })


// get the dates when the attendance for particular subject was taken by a particular teacher
router.post("/attendence-date", fetchuser,
    [
        body("subject_code", "enter valid subject code").isLength({ min: 7, max: 7 })
    ],
    async (req, res) => {
        // check for errors in input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { subject_code } = req.body
        const { teacher_id } = req.user

        let sql = `select date from attendance_tb where subject_code="${subject_code}" and teacher_id=${teacher_id} group by date`
        connection.query(sql, (err, result) => {
            if (err) {
                console.log(err.sqlMessage)
                res.send({ success: false, err })
                return
            }

            if (result) {
                let dates = []
                for (let i = 0; i < result.length; i++) {
                    let dateTime = new Date(result[i].date)
                    let month = dateTime.getMonth() + 1
                    if (month <= 9) {
                        month = "0" + month
                    }
                    let date = dateTime.getFullYear() + "-" + month + "-" + dateTime.getDate()
                    dates[i] = date
                }

                res.send({ success: true, dates })
            }
        })
    })


// get the present and absent details of all the students of particular subject at given date
router.post("/attendence-details", fetchuser,
    [
        body("subject_code", "enter valid subject code").isLength({ min: 7, max: 7 }),
        body("date", "Enter valid date").isLength({ min: 8, max: 10 })
    ],
    (req, res) => {
        // check for errors in input
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { subject_code, date } = req.body
        const { teacher_id } = req.user
        const resp = {}

        let sql = `select count(*) as total from attendance_tb where subject_code="${subject_code}" and teacher_id=${teacher_id} and date="${date}"`

        connection.query(sql, (err, result) => {
            if (err) {
                res.send({ success: false, msg: err.sqlMessage })
            }

            if (result) {
                resp.total = result[0].total
                sql = `select count(*) as present from attendance_tb where subject_code="${subject_code}" and teacher_id=${teacher_id} and date="${date}" and present=1`

                connection.query(sql, (err, result) => {
                    if (err) {
                        res.send({ success: false, msg: err.sqlMessage })
                    }

                    if (result) {
                        resp.present = result[0].present

                        res.send({ success: true, result: resp })
                    }
                })
            }
        })
    })


// Export the module
module.exports = router;