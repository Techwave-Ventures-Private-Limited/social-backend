const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    des: {
        type:String,
        required: true
    },
    banner: {
        type:String,
        required: true
    },
    date: {
        type: String, //TODO : convert to date
        required : true
    },
    time: {
        type :String,
        required : true
    },
    isEventOnline:{
        type:Boolean,
        default : false
    },
    location: {
        type:String,
        required: true
    },
    organizer: {
        type:String,
        required: true
    },
    tags: [{
        type: String
    }],
    speakers: [{
        type: String,
        required: true
    }],
    isPaidEvent : {
        type : Boolean,
        default : true
    },
    ticketPlan : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "TicketPlan",
        default : "",
        required: true
    }],
    userId : {
        type:String
    },
    createAt:{
        type:Date,
        default:Date.now()
    },
    updatedAt: {
        type:Date,
        default:Date.now()
    }

})

module.exports = mongoose.model("Event", eventSchema);

