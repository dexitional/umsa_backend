"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fmsController_1 = __importDefault(require("../controller/fmsController"));
class FmsRoute {
    constructor() {
        this.router = (0, express_1.Router)();
        this.controller = new fmsController_1.default();
        this.initializeRoute();
    }
    initializeRoute() {
        /* Session */
        this.router.get('/bills', this.controller.fetchBills);
        this.router.get('/bills/list', this.controller.fetchBillList);
        this.router.get('/bills/:id', this.controller.fetchBill);
        this.router.get('/bills/:id/receipients', this.controller.billReceivers);
        this.router.post('/bills/:id/include', this.controller.includeBill);
        this.router.post('/bills/:id/exclude', this.controller.excludeBill);
        this.router.get('/bills/:id/activate', this.controller.activateBill);
        this.router.get('/bills/:id/revoke', this.controller.revokeBill);
        this.router.post('/bills', this.controller.postBill);
        this.router.patch('/bills/:id', this.controller.updateBill);
        this.router.delete('/bills/:id', this.controller.deleteBill);
        /* Charges */
        this.router.get('/charges', this.controller.fetchCharges);
        this.router.get('/charges/:id', this.controller.fetchCharge);
        this.router.post('/charges', this.controller.postCharge);
        this.router.patch('/charges/:id', this.controller.updateCharge);
        this.router.delete('/charges/:id', this.controller.deleteCharge);
        /* Payments */
        this.router.get('/payments', this.controller.fetchPayments);
        this.router.get('/payments/other', this.controller.fetchPayments);
        this.router.get('/payments/voucher', this.controller.fetchPayments);
        this.router.get('/payments/:id', this.controller.fetchPayment);
        this.router.post('/payments', this.controller.postPayment);
        this.router.patch('/payments/:id', this.controller.updatePayment);
        this.router.delete('/payments/:id', this.controller.deletePayment);
        /* Third-Party Services & Payments  */
        this.router.get('/payments', this.controller.fetchPayments);
        this.router.post('/payments', this.controller.postPayment);
        /* Accounts & Debtors */
        this.router.get('/accounts', this.controller.fetchAccounts);
        this.router.get('/accounts/debts', this.controller.fetchAccount);
        this.router.get('/accounts/retire/:tag', this.controller.fetchAccount);
        /* Services */
        this.router.get('/services', this.controller.fetchServices);
        this.router.get('/services/:id', this.controller.fetchService);
        this.router.post('/services', this.controller.postService);
        this.router.patch('/services/:id', this.controller.updateService);
        this.router.delete('/services/:id', this.controller.deleteService);
    }
}
exports.default = new FmsRoute().router;
