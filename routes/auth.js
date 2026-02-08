const router = require("express").Router()
const User = require('../models/users')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

router.post("/register", async (req, res) => {

    try {
        const password = req.body.password
        const hashPassword = await bcrypt.hash(password, 10)
        await User.create({ ...req.body, passwordHash: hashPassword, role: 'CUSTOMER' })
        res.status(201).json({ message: 'User Registered Successfully' })
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'User already Registered' })
        }
        else {
            res.status(500).json({ message: 'Internal error', error: error.message })
        }
    }
})


router.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email })
        if (!user) {
            return res.status(400).json({ message: 'User not found' })
        }
        const passwordMatch = await bcrypt.compare(req.body.password, user.passwordHash)

        if (!passwordMatch) {
            return res.status(400).json({ message: 'Incorrect password' })
        }
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' })

        res.status(200).json({ message: "user login successfully", token })
    } catch (error) {
        res.status(500).json({ message: "internal server error", error: error.message })
    }
})


module.exports = router
