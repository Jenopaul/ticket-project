const router = require("express").Router()
const User = require('../models/users')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { pagination } = require('../utils/pagination')


router.post("/agents", async (req, res) => {

    try {
        const password = req.body.password
        const hashPassword = await bcrypt.hash(password, 10)
        await User.create({ ...req.body, passwordHash: hashPassword, role: 'AGENT' })
        res.status(201).json({ message: 'Agent Registered Successfully' })
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ message: 'Agent already Registered' })
        }
        else {
            res.status(500).json({ message: 'Internal error', error: error.message })
        }
    }
})


router.get("/", async (req, res) => {
    try {

        const { page, limit, skip } = pagination(req.query.page, req.query.limit)

        console.log(page, limit, skip)

        if (!req.query.page) {
            const tickets = await User.find().sort({ createdAt: -1 })

            return res.status(200).json({ message: "data fetched successfully", data: tickets })
        }

        const [tickets, total] = await Promise.all([
            User.find()
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            User.countDocuments()
        ])

        res.status(200).json({
            message: "data fetched successfully",
            pageNumber: page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            data: tickets
        })

    } catch (error) {
        res.status(500).json({ message: 'Internal error', error: error.message })
    }
})

module.exports = router
