const mongoose = require("mongoose");

const ticketPlanSchema = new mongoose.Schema({
    
    name: {
        type:String,
        required: true
    },
    price : {
        type: String,
        required: true
    },
    remTicket: {
        type : Number,
        required: true
    },
    userId:{
        type: String,
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

module.exports = mongoose.model("TicketPlan", ticketPlanSchema);

