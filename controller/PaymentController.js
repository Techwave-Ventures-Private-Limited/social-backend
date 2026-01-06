const { instance } = require("../config/razorpay");
const crypto = require("crypto");

const Plan = require("../modules/plan");
const Purchase = require("../modules/purchase");
const User = require("../modules/user");

const mailSender = require("../utils/mailSender");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");

const REQUIRED_POINTS = 100;
const BASIC_PLAN_NAME = "Basic Monthly";

// create razorpay order
exports.capturePayment = async (req, res) => {
    try {
        const { planId } = req.body;
        const userId = req.userId;

        if (!planId) {
            return res.status(400).json({
                success: false,
                message: "Plan ID is required",
            });
        }

        const plan = await Plan.findById(planId);
        if (!plan || !plan.isActive) {
            return res.status(404).json({
                success: false,
                message: "Plan not found or inactive",
            });
        }

        const options = {
            amount: plan.price * 100,
            currency: plan.currency || "INR",
            receipt: `plan_${Date.now()}`,
            notes: {
                planId: planId.toString(),
                userId: userId.toString(),
            },
        };

        const order = await instance.orders.create(options);

        return res.status(200).json({
            success: true,
            data: order,
        });
    } catch (error) {
        console.error("Capture payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not initiate payment",
        });
    }
};

// verify payment and create purchase for the user
exports.verifyPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId,
        } = req.body;

        const userId = req.userId;

        if (
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature ||
            !planId
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing payment details",
            });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_SECRET)
            .update(body)
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }

        const plan = await Plan.findById(planId);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }


        const startDate = new Date();
        const endDate = new Date(
            startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000
        );


        const purchase = await Purchase.create({
            userId,
            planId,
            amountPaid: plan.price,
            currency: plan.currency || "INR",
            status: "active",
            startDate,
            endDate,
            paymentProvider: "razorpay",
            paymentId: razorpay_payment_id,
        });

        const user = await User.findByIdAndUpdate(userId, {
            $set: { activePurchase: purchase._id },
        });

        await mailSender(
            user.email,
            "Payment Successful – Plan Activated",
            paymentSuccessEmail(
                `${user.name}`,
                plan.name,
                purchase.amountPaid,
                razorpay_order_id,
                razorpay_payment_id,
                purchase.startDate,
                purchase.endDate
            )
        );

        return res.status(200).json({
            success: true,
            message: "Payment verified & plan activated",
            purchase,
        });
    } catch (error) {
        console.error("Verify payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
        });
    }
};

exports.getMyActivePlan = async (req, res) => {
    try {
        const userId = req.userId;

        const purchase = await Purchase.findOne({
            userId,
            status: "active",
            endDate: { $gt: new Date() },
        }).populate("planId");

        if (!purchase) {
            return res.status(200).json({
                success: true,
                activePlan: null,
            });
        }

        return res.status(200).json({
            success: true,
            activePlan: purchase,
        });
    } catch (error) {
        console.error("Get active plan error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not fetch active plan",
        });
    }
};

exports.cancelMyPlan = async (req, res) => {
    try {
        const userId = req.userId;

        const purchase = await Purchase.findOneAndUpdate(
            {
                userId,
                status: "active",
                endDate: { $gt: new Date() },
            },
            {
                status: "cancelled",
                isAutoRenew: false,
            },
            { new: true }
        );

        if (!purchase) {
            return res.status(404).json({
                success: false,
                message: "No active plan found",
            });
        }

        await User.findByIdAndUpdate(userId, {
            $set: { activePurchase: null },
        });

        return res.status(200).json({
            success: true,
            message: "Plan cancelled successfully",
        });
    } catch (error) {
        console.error("Cancel plan error:", error);
        return res.status(500).json({
            success: false,
            message: "Could not cancel plan",
        });
    }
};

exports.redeemPlanWithPoints = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (user.activePurchase) {
      return res.status(409).json({
        success: false,
        message: "You already have an active plan",
      });
    }

    if (user.points < REQUIRED_POINTS) {
      return res.status(403).json({
        success: false,
        message: "Insufficient points",
      });
    }

    const plan = await Plan.findOne({
      name: BASIC_PLAN_NAME,
      isActive: true,
      durationInDays: 30,
    });

    if (!plan) {
      return res.status(500).json({
        success: false,
        message: "Basic plan not available",
      });
    }

    const startDate = new Date();
    const endDate = new Date(
      startDate.getTime() + plan.durationInDays * 24 * 60 * 60 * 1000
    );

    const purchase = await Purchase.create({
      userId,
      planId: plan._id,
      amountPaid: 0,
      currency: "INR",
      status: "active",
      startDate,
      endDate,
      paymentProvider: "points",
      paymentId: `points_${Date.now()}`,
    });

    await User.findByIdAndUpdate(userId, {
      $inc: { points: -REQUIRED_POINTS },
      $set: { activePurchase: purchase._id },
    });

    return res.status(200).json({
      success: true,
      message: "Plan redeemed successfully using points",
      purchase,
    });

  } catch (error) {
    console.error("Redeem plan error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to redeem plan",
    });
  }
};

