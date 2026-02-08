function pagination(page = 1, limit = 10) {
    page = parseInt(page)
    limit = parseInt(limit)

    const skip = (page - 1) * limit

    return { page, limit, skip }

}

module.exports = { pagination }