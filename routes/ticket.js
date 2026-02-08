const router = require("express").Router()
const auth = require("../middleware/auth")
const Ticket = require('../models/tickets')
const { pagination } = require('../utils/pagination')
const User = require('../models/users')
const Comment = require('../models/comments')
const upload = require("../middleware/upload")
const Attachment = require("../models/attachments")
const { Readable } = require("stream")
const getBucket = require("../database/gridfs")

router.post("/", auth, async (req, res) => {

    try {
        const ticket = await Ticket.create({
            ...req.body,
            createdBy: req.user.id
        })

        res.status(201).json({ message: "ticket created successfully", ticket })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})

router.get("/", auth, async (req, res) => {

    try {
        let filter = {}
        if (req.user.role === 'CUSTOMER') {
            filter.createdBy = req.user.id
        }
        if (req.user.role === 'AGENT') {
            filter.assignedTo = req.user.id
        }

        let ticketlist = await Ticket.find(filter)
        res.status(200).json({ message: "tickets fetched successfully", data: ticketlist })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})


router.get("/:id", auth, async (req, res) => {

    try {
        let ticketId = req.params.id
        let ticketlist = await Ticket.findById(ticketId)

        if (ticketlist) {
            res.status(200).json({ message: "ticket fetched successfully", data: ticketlist })
        }
        else {
            res.status(400).json({ message: "ticket not found " })
        }

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})

router.patch("/:id", auth, async (req, res) => {

    try {
        let ticketId = req.params.id
        let ticket = await Ticket.findById(ticketId)

        if (!ticket) {
            res.status(400).json({ message: "ticket not found" })
        }

        if (req.user.role === "CUSTOMER") {

            if (ticket.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: "Not your ticket" })
            }

            if (ticket.status !== "OPEN") {
                return res.status(400).json({
                    message: "Customer can update only OPEN tickets"
                })
            }
        }

        const updateData = {
            title: req.body.title,
            description: req.body.description
        }

        const updatedTicket = await Ticket.findByIdAndUpdate(
            ticketId,
            updateData,
            { new: true, runValidators: true }
        )

        res.status(200).json({ message: "ticket updated successfully", data: updatedTicket })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})


router.patch("/:id/assign", auth, async (req, res) => {

    try {

        if (!["ADMIN", "AGENT"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only ADMIN or AGENT can assign tickets" })
        }

        console.log("099998888")
        const ticketId = req.params.id
        const { agentId } = req.body

        const ticket = await Ticket.findById(ticketId)
        console.log(ticket, "=====")
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        const agent = await User.findById(agentId)

        if (!agent || agent.role !== "AGENT") {
            return res.status(400).json({ message: "Assigned user must be a valid AGENT" })
        }

        ticket.assignedTo = agentId
        await ticket.save()
        res.status(200).json({ message: "Ticket assigned successfully" })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})


router.patch("/:id/status", auth, async (req, res) => {

    try {
        const { status } = req.body

        if (!["ADMIN", "AGENT"].includes(req.user.role)) {
            return res.status(403).json({ message: "Only ADMIN or AGENT can update ticket status" })
        }

        const ticket = await Ticket.findById(req.params.id)

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (!ticket.assignedTo) {
            return res.status(404).json({ message: "ticket has to be assigned" })
        }

        const flow = { OPEN: "IN_PROGRESS", IN_PROGRESS: "RESOLVED" }

        if (flow[ticket.status] !== status) {
            return res.status(400).json({
                message: `Invalid status transition from ${ticket.status} to ${status}`
            })
        }

        ticket.status = status
        await ticket.save()

        return res.status(200).json({ message: "Ticket status updated successfully", data: ticket })

    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})

router.delete("/:id", auth, async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id)

        if (!ticket) {
            return res.status(404).json({ message: 'ticket not found' })
        }

        if (req.user.role === 'ADMIN') {
            await ticket.deleteOne()
            return res.status(200).json({ message: 'Ticket deleted Successfully' })
        }

        if (req.user.role === 'CUSTOMER') {

            if (ticket.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Not your ticket' })
            }

            if (ticket.status !== 'OPEN') {
                return res.status(400).json({ message: 'Only OPEN tickets can be deleted by CUSTOMER' })
            }

            const attachmentCount = await Attachment.countDocuments({
                ticketId: ticket._id
            })

            if (attachmentCount > 0) {
                return res.status(400).json({ message: 'Cannot delete ticket with attachments' })
            }

            await ticket.deleteOne()
            return res.status(200).json({ message: 'Ticket deleted Successfully' })
        }

        return res.status(403).json({ message: 'Agent cannot delete ticket' })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})

router.post("/:id/comments", auth, async (req, res) => {

    try {
        const ticketId = req.params.id
        const { message } = req.body

        if (!message) {
            return res.status(400).json({ message: "Comment message is required" })
        }

        const ticket = await Ticket.findById(ticketId)
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (req.user.role === "CUSTOMER") {
            if (ticket.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: "Customer can comment only on own tickets" })
            }
        }

        if (req.user.role === "AGENT") {
            if (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user.id) {
                return res.status(403).json({ message: "Agent can comment only on assigned tickets" })
            }
        }

        const comment = await Comment.create({ ticketId, message, authorId: req.user.id })

        return res.status(201).json({ message: "Comment added successfully", data: comment })

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
})

router.get("/:id/comments", auth, async (req, res) => {
    try {
        const ticketId = req.params.id

        const ticket = await Ticket.findById(ticketId)
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (req.user.role === "CUSTOMER") {
            if (ticket.createdBy.toString() !== req.user.id) {
                return res.status(403).json({ message: "Access denied" })
            }
        }

        if (req.user.role === "AGENT") {
            if (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user.id) {
                return res.status(403).json({ message: "Access denied" })
            }
        }

        const comments = await Comment.find({ ticketId })
            .sort({ createdAt: -1 })

        return res.status(200).json({ total: comments.length, data: comments })

    } catch (error) {
        return res.status(500).json({ message: "Internal server error", error: error.message })
    }
})


router.post("/:id/attachments", auth, upload.array("files", 3), async (req, res) => {

    try {
        const ticketId = req.params.id
        const bucket = getBucket()

        const ticket = await Ticket.findById(ticketId)
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" })
        }

        if (req.user.role === "CUSTOMER" && ticket.createdBy.toString() !== req.user.id) {
            return res.status(403).json({ message: "Access denied" })
        }

        if (req.user.role === "AGENT" && (!ticket.assignedTo || ticket.assignedTo.toString() !== req.user.id)) {
            return res.status(403).json({ message: "Access denied" })
        }

        const existing = await Attachment.countDocuments({ ticketId })
        if (existing + req.files.length > 3) {
            return res.status(400).json({ message: "Maximum 3 attachments allowed per ticket" })
        }

        const savedFiles = []

        for (const file of req.files) {
            const uploadStream = bucket.openUploadStream(file.originalname, {
                contentType: file.mimetype
            })

            Readable.from(file.buffer).pipe(uploadStream)

            await new Promise((resolve, reject) => {
                uploadStream.on("finish", resolve)
                uploadStream.on("error", reject)
            })

            const attachment = await Attachment.create({
                ticketId,
                uploadedBy: req.user.id,
                fileId: uploadStream.id,
                originalName: file.originalname,
                fileType: file.mimetype,
                size: file.size
            })

            savedFiles.push(attachment)
        }

        return res.status(201).json({ message: "Attachments saved successfully", data: savedFiles })

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
})

router.get("/:id/attachments", auth, async (req, res) => {

    try {
        const attachments = await Attachment.find({ ticketId: req.params.id })
        res.json({ message: "Attachements fetched successfully", total: attachments.length, data: attachments })
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message })
    }
})


router.get("/attachments/:id/download", auth, async (req, res) => {
    try {
        const attachment = await Attachment.findById(req.params.id)
        if (!attachment) {
            return res.status(404).json({ message: "Attachment not found" })
        }

        const bucket = getBucket()

        res.set("Content-Type", attachment.fileType)
        res.set("Content-Disposition", `attachment filename="${attachment.originalName}"`)

        bucket.openDownloadStream(attachment.fileId).pipe(res)

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message })
    }
})

module.exports = router