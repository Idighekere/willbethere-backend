import { ENVIRONMENT } from '../../common/config/environment.js'
import { sendRSVPMailTemplate } from '../../common/templates/rsvp.js'
import AppError from '../../common/utils/appError.js'
import { AppResponse } from '../../common/utils/appResponse.js'
import { uploadFile } from '../../common/utils/cloudinary.js'
import { catchAsync } from '../../common/utils/errorHandler.js'
import { formatDate } from '../../common/utils/helper.js'
import { sendMail } from '../../common/utils/sendMail.js'
import { EventModel } from '../schemas/event.schema.js'
import { GuestModel } from '../schemas/guest.schema.js'
import { ItemModel } from '../schemas/item.schema.js'
import { UserModel } from '../schemas/user.schema.js'

export const createEvent = catchAsync(async (req, res) => {
    const { user, file } = req
    const checkExisting = await EventModel.findOne({
        name: req.body.name,
        user: user,
    })

    if (checkExisting) {
        throw new AppError('Event already exists', 409)
    }

    if (!file) {
        throw new AppError('Please provide an image for the event.')
    }

    // Validation start

    // if (req.body.start > Date()) {
    //   throw new AppError('Start date should be at a later date', 409);
    // }

    // if (req.body.start > req.body.end) {
    //   throw new AppError('End date should be after start date', 409);
    // }
    // Validation End

    const imageUrl = await uploadFile('WillBeThere', file)
    const itemsSplit = req.body.items.split(',')

    let event = await EventModel.create({
        ...req.body,
        user: user,
        image: imageUrl.secure_url,
        items: itemsSplit,
    })

    const eventData = event._doc
    eventData['user'] = user._id
    const attendingGuestCount = await event.attendingGuestCount
    const notAttendingGuestCount = await event.notAttendingGuestCount
    const noResponseCount = await event.noResponseGuestCount
    const plusOnesGuestCount = await event.getTotalPlusOnes()

    return AppResponse(res, 201, 'Event Created Successfully', {
        ...eventData,
        attendingGuestCount,
        notAttendingGuestCount,
        noResponseCount,
        plusOnesGuestCount,
    })
})

export const myEvents = catchAsync(async (req, res) => {
    const { user } = req
    const events = await EventModel.find({ user: user }).sort({ createdAt: -1 })

    const eventsWithCount = await Promise.all(
        events.map(async (event) => {
            const attendingGuestCount = await event.attendingGuestCount
            const notAttendingGuestCount = await event.notAttendingGuestCount
            const noResponseCount = await event.noResponseGuestCount
            const plusOnesGuestCount = await event.getTotalPlusOnes()

            return {
                ...event.toObject(),
                attendingGuestCount,
                notAttendingGuestCount,
                noResponseCount,
                plusOnesGuestCount,
            }
        })
    )

    return AppResponse(
        res,
        200,
        'All events for user retrieved successfully',
        eventsWithCount
    )
})

export const getEvent = catchAsync(async (req, res) => {
    const { user } = req
    const eventID = req.params.id

    const event = await EventModel.findOne({ user: user, _id: eventID })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const attendingGuestCount = await event.attendingGuestCount
    const notAttendingGuestCount = await event.notAttendingGuestCount
    const noResponseCount = await event.noResponseGuestCount
    const plusOnesGuestCount = await event.getTotalPlusOnes()

    return AppResponse(res, 200, '', {
        ...event._doc,
        attendingGuestCount,
        notAttendingGuestCount,
        noResponseCount,
        plusOnesGuestCount,
    })
})

export const myRSVPs = catchAsync(async (req, res) => {
    const { user } = req

    const rsvps = await GuestModel.find({ email: user.email }).populate('event')

    return AppResponse(
        res,
        200,
        'All events for user retrieved successfully',
        rsvps
    )
})

export const inviteGuest = catchAsync(async (req, res) => {
    const { user } = req
    const { name, email } = req.body
    const eventID = req.params.id
    const event = await EventModel.findOne({ user: user, _id: eventID })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const checkInvitee = await GuestModel.findOne({
        email: req.body.email,
        event: event,
    })

    if (checkInvitee) {
        throw new AppError('Invite already sent to guest', 409)
    }

    const guest = await GuestModel.create({
        ...req.body,
        event: event,
    })
    if (guest) {
        const date = new Date(event.start)
        const endDate = new Date(event.end)
        const user = await UserModel.findById(event.user._id)
        const template = sendRSVPMailTemplate({
            name: guest.name,
            organizerName: user.name,
            date: date,
            endDate: endDate,
            title: event.name,
            banner: event.image,
            details: event.description,
            url: `${ENVIRONMENT.APP.FRONTEND_URL}/rsvp/${event.id}?guest=${guest.id}`,
        })

        await sendMail(email, `You are invited to ${event.name}`, template)
    }

    // Send mail to guest

    return AppResponse(
        res,
        201,
        'Guest has been sent an invite mail to your event',
        guest
    )
})

export const eventGuests = catchAsync(async (req, res) => {
    const { user } = req
    const eventID = req.params.id
    const event = await EventModel.findOne({ user: user, _id: eventID })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const guests = await GuestModel.find({ event: event })

    return AppResponse(res, 200, '', guests)
})

export const editEvent = catchAsync(async (req, res) => {
    const { user } = req
    const event = await EventModel.findOne({ user: user, _id: req.params.id })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const updatedEvent = await EventModel.findByIdAndUpdate(event, req.body, {
        new: true,
    })

    return AppResponse(res, 200, 'Event Updated successfully', updatedEvent)
})

export const deleteEvent = catchAsync(async (req, res) => {
    const { user } = req
    const event = await EventModel.findOne({ user: user, _id: req.params.id })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    await EventModel.findByIdAndDelete(event)

    return AppResponse(res, 204, 'Event Deleted', null)
})

export const addEventItem = catchAsync(async (req, res) => {
    const { user } = req
    const event = await EventModel.findOne({ user: user, _id: req.params.id })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const item = await ItemModel.create({
        event: event,
        ...req.body,
    })

    return AppResponse(res, 201, 'Item Created Successfully', item)
})

export const getEventItems = catchAsync(async (req, res) => {
    const { user } = req
    const event = await EventModel.findOne({ user: user, _id: req.params.id })

    if (!event) {
        throw new AppError('Event does not exists', 409)
    }

    const items = await ItemModel.find({ event: event })

    return AppResponse(res, 200, 'Items Fetched Successfully', items)
})

export const toggleShowEventItem = catchAsync(async (req, res) => {
    const { user } = req
    let item = await ItemModel.findOne({
        user: user,
        event: req.params.event,
        _id: req.params.id,
    })
    console.log

    if (!item) {
        throw new AppError('Item does not exists', 409)
    }

    item.show = !item.show
    item.save()

    return AppResponse(res, 200, 'Item toggled successfully', item)
})

export const deleteEventItem = catchAsync(async (req, res) => {
    const { user } = req
    let item = await ItemModel.findOne({
        user: user,
        event: req.params.event,
        _id: req.params.id,
    })

    if (!item) {
        throw new AppError('Item does not exists', 409)
    }

    await ItemModel.findByIdAndDelete(item)

    return AppResponse(res, 204, 'Item Deleted', null)
})
