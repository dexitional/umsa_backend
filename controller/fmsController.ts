import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from 'uuid';
import EvsModel from '../model/evsModel'
import AuthModel from '../model/authModel'
import { PrismaClient, currency } from '../prisma/client/ums'
import { getSemesterFromCode } from "../util/helper";
import moment from "moment";

const sms = require('../config/sms');
const evs = new EvsModel();
const Auth = new AuthModel();
const fms = new PrismaClient()
const SENDERID = process.env.UMS_SENDERID;
const DOMAIN = process.env.UMS_DOMAIN;



export default class FmsController {
     
  /* Bills */
  async fetchBillList(req: Request,res: Response) {
      try {
         const resp = await fms.bill.findMany({
             where: { status: true }, 
             include: { session: true, program: true, bankacc: true },
             orderBy: { createdAt:'asc' } 
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async fetchBills(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition = { }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { narrative: { contains: keyword } },
                  { session: { title: { contains: keyword }} },
                  { program: { shortName: { contains: keyword }} },
               ],
            }
         }
         const resp = await fms.$transaction([
            fms.bill.count({
               ...(searchCondition),
            }),
            fms.bill.findMany({
               ...(searchCondition),
               include: { session: true, program: true, bankacc: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async fetchBill(req: Request,res: Response) {
      try {
         const resp = await fms.bill.findUnique({
            where: { id: req.params.id }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async includeBill(req: Request,res: Response) {
   try {
      const { tag, action } = req.body;
      let resp;
      if(action == 'create') 
         resp = await fms.bill.update({
            where: { id: req.params.id },
            data: { includeStudentIds: { jsonb_set: { path: '$', value: { tag }, append: true } } }
         })
      else 
         resp = await fms.bill.update({
            where: { id: req.params.id, includeStudentIds: { path:'$', array_contains: tag } },
            data: { 
              includeStudentIds:  { jsonb_remove: {  path: '$' } }  
            }
         })
      
      if(resp){
         res.status(200).json(resp)
      } else {
         res.status(204).json({ message: `no record found` })
      }
   } catch (error: any) {
      console.log(error)
      return res.status(500).json({ message: error.message }) 
   }
  }

  async excludeBill(req: Request,res: Response) {
      try {
         const { tag, action } = req.body;
         let resp;
         if(action == 'create') 
            resp = await fms.bill.update({
               where: { id: req.params.id },
               data: { excludeStudentIds: { jsonb_set: { path: '$', value: { tag }, append: true } } }
            })
         else 
            resp = await fms.bill.update({
               where: { id: req.params.id, excludeStudentIds: { path:'$', array_contains: tag } },
               data: { 
               excludeStudentIds:  { jsonb_remove: {  path: '$' } }  
               }
            })
         
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async billReceivers(req: Request,res: Response) {
      try {
         const resp = await fms.studentAccount.findMany({
            where: { 
               billId: req.params.id 
            },
            include: { student: true }
         })
         if(resp?.length){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async activateBill(req: Request,res: Response) {
      try {
         const bs:any = await fms.bill.findUnique({
            where: { id: req.params.id },
            include: { session: true }
         })
         if(bs){
            let students:any = []
            // Locate Students that Bill should Apply
            const semesters = await getSemesterFromCode(bs.session?.semester,bs.mainGroupCode);
            const st:any = bs?.tag == 'sub'
                  ? await fms.$queryRaw`select id from ais_student where programId = ${bs?.programId} and ((date_format(entryDate,'%m') = '01' and semesterNum <= 2) or (date_format(entryDate,'%m') = '01' and semesterNum <= 4 and entrySemesterNum in (3))) and entryGroup = ${bs?.type} and semesterNum in (${semesters})`
                  : await fms.$queryRaw`select id from ais_student where programId = ${bs?.programId} and ((date_format(entryDate,'%m') = '01' and semesterNum > 2) or (date_format(entryDate,'%m') = '01' and semesterNum <= 4 and entrySemesterNum not in (1,3)) or (date_format(entryDate,'%m') <> '01')) and entryGroup = ${bs?.type} and semesterNum in (${semesters})`;
            if(st?.length) students = [ ... st.map((r:any) => r.id) ];
            // Locate Included Students
            if(bs?.includeStudentIds?.length) students = [ ...bs?.includeStudentIds ];
            // Remove Excluded Students
            if(bs?.excludeStudentIds?.length) students = students?.filter((r:any) => !bs?.excludeStudentIds.includes(r));
            // Insert bills in student accounts
            if(students?.length){
               const stdata = await Promise.all(students?.map( async (r:any) => {  
                  const ss = await fms.student.findFirst({ where: { OR: [{ id: r},{ indexno: r }]}});
                  const studentId = ss?.id; 
                  return ({
                      studentId,
                      sessionId: bs?.sessionId,
                      billId: bs?.id,
                      type: 'BILL',
                      narrative: bs?.title,
                      currency: bs?.currency,
                      amount: bs?.amount
                  })
               }))
               const ups = await fms.studentAccount.createMany({ data: stdata })
               if(ups?.count){
                  // Update bill status
                  const bs = await fms.bill.update({ where: { id: req.params.id }, data: { posted: true } })
                  res.status(200).json(bs)
               } else {
                  res.status(204).json({ message: `something happened, No bill created` })
               }
            }
         } else {
            res.status(204).json({ message: `no bill found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async revokeBill(req: Request,res: Response) {
   try {
      // Remove Bill from student accounts
      const sts = await fms.studentAccount.deleteMany({ where: { billId: req.params.id }})
      // Update Bill status
      const resp = await fms.bill.update({ where: { id: req.params.id }, data: { posted: false } })
      if(sts?.count && resp){
         res.status(200).json(resp)
      } else {
         res.status(204).json({ message: `no record found` })
      }
   } catch (error: any) {
      console.log(error)
      return res.status(500).json({ message: error.message }) 
   }
  }

  async postBill(req: Request,res: Response) {
      try {
         const { programId, bankaccId, sessionId } = req.body
         delete req.body.sessionId;  delete req.body.bankaccId;
         delete req.body.programId;
      
         const resp = await fms.bill.create({
            data: {
               ... req.body,
               ... sessionId && ({ session: { connect: { id: sessionId }}}),
               ... bankaccId && ({ bankacc: { connect: { id:bankaccId }}}),
               ... programId && ({ program: { connect: { id:programId }}}),
            }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no records found` })
         }
         
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async updateBill(req: Request,res: Response) {
      try {
         const { programId, bankaccId, sessionId } = req.body
         delete req.body.sessionId;  delete req.body.bankaccId;
         delete req.body.programId;
      
         const resp = await fms.admission.update({
            where: { 
               id: req.params.id 
            },
            data: {
               ... req.body,
               ... sessionId && ({ session: { connect: { id: sessionId }}}),
               ... bankaccId && ({ bankacc: { connect: { id:bankaccId }}}),
               ... programId && ({ program: { connect: { id:programId }}}),
            }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }

  async deleteBill(req: Request,res: Response) {
      try {
         const bs = await fms.bill.update({
            where: {  id: req.params.id  },
            data: {
               studentAccount: { deleteMany: { billId: req.params.id } }
            }
         })
         if(bs){
            const resp = await fms.bill.delete({ where: {  id: req.params.id  }})
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records deleted` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
  }


   /* Charges */
   async fetchCharges(req: Request,res: Response) {
   const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
   const offset = (page - 1) * pageSize;
   let searchCondition = { }
   try {
      if(keyword) searchCondition = { 
         where: { 
            OR: [
               { title: { contains: keyword } },
               { student: { id: { contains: keyword }} },
               { student: { indexno: { contains: keyword }} },
               { student: { fname: { contains: keyword }} },
               { student: { lname: { contains: keyword }} },
            ],
         }
      }
      const resp = await fms.$transaction([
         fms.charge.count({
            ...(searchCondition),
         }),
         fms.charge.findMany({
            ...(searchCondition),
            include: { student: true },
            skip: offset,
            take: Number(pageSize),
         })
      ]);
      
      if(resp && resp[1]?.length){
         res.status(200).json({
            totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
            totalData: resp[1]?.length,
            data: resp[1],
         })
      } else {
         res.status(204).json({ message: `no records found` })
      }
   } catch (error: any) {
      console.log(error)
      return res.status(500).json({ message: error.message }) 
   }
   }

   async fetchCharge(req: Request,res: Response) {
      try {
         const resp = await fms.charge.findUnique({
            where: { id: req.params.id }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async postCharge(req: Request,res: Response) {
      try {
         const { studentId } = req.body
         delete req.body.studentId;
         const resp = await fms.charge.create({
            data: {
               ... req.body,
               ... studentId && ({ student: { connect: { id: studentId }}}),
               studentAccount: { 
                  create: { 
                    data: {
                       studentId,
                       narrative: req?.body?.narrative,
                       amount: req?.body?.amount,
                       type: 'CHARGE',
                       currency: req?.body?.currency,
                    } 
                  }
               }
            }
         })
         if(resp){
            // Create record in student account
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no records found` })
         }
         
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async updateCharge(req: Request,res: Response) {
      try {
         const { studentId } = req.body
         delete req.body.studentId;
      
         const resp = await fms.charge.update({
            where: { 
               id: req.params.id 
            },
            data: {
               ... req.body,
               ... studentId && ({ student: { connect: { id: studentId }}}),
               studentAccount: { 
                  update: { 
                    data: {
                       studentId,
                       narrative: req?.body?.narrative,
                       amount: req?.body?.amount,
                       type: 'CHARGE',
                       currency: req?.body?.currency,
                    } 
                  }
               }
            }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async deleteCharge(req: Request,res: Response) {
      try {
         const bs = await fms.charge.update({
            where: {  id: req.params.id  },
            data: {
               studentAccount: { deleteMany: { chargeId: req.params.id } }
            }
         })
         if(bs){
            const resp = await fms.charge.delete({ where: {  id: req.params.id  }})
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records deleted` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }


   /* Payments */
   async fetchPayments(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition:any = { where: { transtypeId: { in: [2] } } }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { transtag: { contains: keyword } },
                  { student: { id: { contains: keyword }} },
                  { student: { indexno: { contains: keyword }} },
                  { student: { fname: { contains: keyword }} },
                  { student: { lname: { contains: keyword }} },
               ],
               AND: [
                  { transtypeId: { in: [2] } }
               ]
            }
         }
         const resp = await fms.$transaction([
            fms.transaction.count({
               ...(searchCondition),
            }),
            fms.transaction.findMany({
               ...(searchCondition),
               include: { student: { include: { program: true }}, transtype: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async fetchPaymentOthers(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition:any = { where: { transtypeId: { notIn: [1,2] } } }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { transtag: { contains: keyword } },
                  { student: { id: { contains: keyword }} },
                  { student: { indexno: { contains: keyword }} },
                  { student: { fname: { contains: keyword }} },
                  { student: { lname: { contains: keyword }} },
               ],
               AND: [
                  { transtypeId: { notIn: [1,2] } }
               ]
            }
         }
         const resp = await fms.$transaction([
            fms.transaction.count({
               ...(searchCondition),
            }),
            fms.transaction.findMany({
               ...(searchCondition),
               include: { student: { include: { program: true }}, transtype: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async fetchPaymentVouchers(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition:any = { where: { transtypeId: { in: [1] } } }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { transtag: { contains: keyword } },
                  { student: { id: { contains: keyword }} },
                  { student: { indexno: { contains: keyword }} },
                  { student: { fname: { contains: keyword }} },
                  { student: { lname: { contains: keyword }} },
               ],
               AND: [
                  { transtypeId: { in: [1] } }
               ]
            }
         }
         const resp = await fms.$transaction([
            fms.transaction.count({
               ...(searchCondition),
            }),
            fms.transaction.findMany({
               ...(searchCondition),
               include: { student: { include: { program: true }}, transtype: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }
   
   async fetchPayment(req: Request,res: Response) {
      try {
         const resp = await fms.transaction.findUnique({
            where: { id: req.params.id }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async postPayment(req: Request,res: Response) {
      try {
         const { studentId,transtypeId,bankaccId,collectorId } = req.body
         delete req.body.studentId; delete req.body.transtypeId;
         delete req.body.bankaccId; delete req.body.collectorId;
         const narrative = `Payment of ${transtypeId == 8 ? 'Graduation' : transtypeId == 3 ? 'Resit' : transtypeId == 8 ? 'Late Registration' : 'Academic' } Fees`
         const resp = await fms.transaction.create({
            data: {
               ... req.body,
               ... collectorId && ({ collector: { connect: { id: collectorId }}}),
               ... bankaccId && ({ bankacc: { connect: { id: bankaccId }}}),
               ... studentId && ({ student: { connect: { id: studentId }}}),
               ... transtypeId && ({ transtype: { connect: { id: transtypeId }}}),
               // If Fees,Late,Resit,Graduation transaction
               ... transtypeId && ['2','3','4','8'].includes(transtypeId) && ({ studentAccount: { createMany: {  data: { studentId, narrative, amount: (-1 * req?.body?.amount), type: 'PAYMENT', currency: req?.body?.currency }  }}}),
               // If Voucher transaction
               //... transtypeId && transtypeId == '1' && ({ transtype: { connect: { id: transtypeId }}}),
            }
         })
         if(resp){
            // Retire Student Account Balance after Fees,Late,Resit,Graduation transaction
            if(['2','3','4','8'].includes(transtypeId)){
              const bal:any = await fms.studentAccount.aggregate({ _sum: { amount: true }, where: { studentId } });
              await fms.student.update({ where: { id: studentId }, data: { accountNet: bal?._sum?.amount }})
            }
            // Return Response
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no records found` })
         }
         
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async updatePayment(req: Request,res: Response) {
      try {
         const { studentId,transtypeId,bankaccId,collectorId } = req.body
         delete req.body.studentId; delete req.body.transtypeId;
         delete req.body.bankaccId; delete req.body.collectorId;
         let voucher;
         const narrative = `Payment of ${transtypeId == 8 ? 'Graduation' : transtypeId == 3 ? 'Resit' : transtypeId == 8 ? 'Late Registration' : 'Academic' } Fees`
         if(transtypeId == '1') voucher = await fms.voucher.findFirst({ where: { }, include: { admission: true }});
         const resp = await fms.transaction.update({
            where: { id: req.params.id },
            data: {
               ... req.body,
               ... collectorId && ({ collector: { connect: { id: collectorId }}}),
               ... bankaccId && ({ bankacc: { connect: { id: bankaccId }}}),
               ... studentId && ({ student: { connect: { id: studentId }}}),
               ... transtypeId && ({ transtype: { connect: { id: transtypeId }}}),
               // If Fees,Late,Resit,Graduation transaction
               ... transtypeId && ['2','3','4','8'].includes(transtypeId) && ({ studentAccount: { updateMany: {  data: { studentId, narrative, amount: (-1 * req?.body?.amount), type: 'PAYMENT', currency: req?.body?.currency }  }}}),
               // If Voucher transaction
               //... transtypeId && transtypeId == '1' && ({ activityFinanceVoucher: { update: { data: {  } }}}),
            }
         })
         if(resp){
            // Retire Student Account Balance after Fees,Late,Resit,Graduation transaction
            if(['2','3','4','8'].includes(transtypeId)){
               const bal:any = await fms.studentAccount.aggregate({ _sum: { amount: true }, where: { studentId } });
               await fms.student.update({ where: { id: studentId }, data: { accountNet: bal?._sum?.amount }})
             }
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async deletePayment(req: Request,res: Response) {
      try {
         const bs = await fms.transaction.update({
            where: {  id: req.params.id  },
            data: { 
               studentAccount: { deleteMany: { transactId: req.params.id } }, 
               activityFinanceVoucher: { deleteMany: { transactId: req.params.id } } 
            }
         })
         if(bs){
            const resp = await fms.transaction.delete({ where: {  id: req.params.id  }})
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records deleted` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }


   /* Bank API Transactions  */

   async loadPayServices(req: Request,res: Response) { 
      // LOAD_API_SERVICES
      try {
         const resp = await fms.transtype.findMany({
            where: { status: true },
            include: { servicefee: { select: { amountInGhc: true, amountInUsd: true }, where: { status: true } } }
         })
         if(resp?.length){
            const data = resp?.map((row:any) => {
               return ({ serviceId: row.id, serviceName: row.title, serviceChargeInGHC: row.servicefee[0]?.amountInGhc || 0, serviceChargeInUSD: row.servicefee[0]?.amountInUsd || 0 });
            });
            res.status(200).json({ success: true, data })
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async loadPayService(req: Request,res: Response) {
      try {
         const type:any = req.params.type;
         const refno = req.params.refno;
         if (refno && type != 1) {
            var dt, ft = 0;
            const st:any = await fms.student.findFirst({
                where: { OR: [ { id: refno }, { indexno: refno } ]},
                include: { program: { select: { shortName: true } } }
            });
            if (st) {
              dt = {
                studentId: st.id,
                indexno: st.indexno,
                name: `${st.fname} ${st.mname && st.mname+' '}${st.lname}`,
                program: st?.program?.shortName,
                year: st.semesterNum ? Math.ceil(st.semesterNum/2) : 'none',
                serviceId: type
              }
              
              if(type == 2){ /* Student Account Balance */
                ft = st?.accountNet;

              } else if([4,8].includes(type)){ /* Graduation, Late Fine  Charges */
                const ac = await fms.servicefee.findUnique({ where: { transtypeId: Number(type) }});
                if(ac) ft = st.entryGroup == 'INT' ? ac.amountInUsd: ac.amountInGhc;

              } else if(type == 3){ /* Resit Charges */
                const rs:any = await fms.resit.count({ where: { paid: false, indexno: st?.indexno  }});
                const ac = await fms.servicefee.findUnique({ where: { transtypeId: Number(type) }});
                if(ac && rs) ft = st.entryGroup == 'INT' ? rs?.count * ac.amountInUsd: rs?.count * ac.amountInGhc;
              }
              // Return Information
              return res.status(200).json({ success: true, data: { ...dt, serviceCharge: ft } });
            
            } else {
              return res.status(200).json({ success: false, data: null, msg: "Invalid Student ID or Index Number" });
            }
    
           
         } else if (type == 1) { 
            // LOAD_VOUCHER_FORMS
            const pr = await fms.amsPrice.findMany({ where: { status: true }});
            const sm = await fms.admission.findFirst({ where: { default: true }});
            if(pr && sm){
               const forms = pr.map((r:any) => ({ formId: r.id, formName: r.title, currency: r.currency, serviceCharge: r.amount  }))
               return res.status(200).json({ success: true, data: { serviceId: type, ...sm, forms } });
            } 
            return res.status(403).json({ success: false, data: null, msg: "Invalid request" });
          
         } else {
            return res.status(403).json({ success: false, data: null, msg: "Invalid request" });
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async payService(req: Request,res: Response) {
      try {
        
         console.log(req.body)
         const api = req.query.api;
         const cl:any = await fms.vendor.findFirst();
         let { serviceId, amountPaid, currency, studentId, refNote, transRef, buyerName, buyerPhone, formId, sessionId } = req.body;
            serviceId = Number(serviceId)
            amountPaid = parseFloat(amountPaid)
         const tr = await fms.transaction.findFirst({ where: { transtag: transRef }})
           
         const data:any = {
           collectorId: cl.id,
           transtypeId: serviceId,
           currency,
           amount: amountPaid,
           reference: refNote,
           studentId: studentId,
           transtag: transRef,
         };
   
         /* BUY VOUCHER */
         if (serviceId == 1) {
           if (!sessionId || sessionId == "") return res.status(200).json({ success: false,data: null,msg: `No Admission Session indicated!` }); // Check for Required but Empty field and return error
           // Create Transaction
           if(!tr){
               const pr = await fms.amsPrice.findUnique({ where: { id: formId } });
               const vc:any = await fms.voucher.findFirst({ where: { admissionId: sessionId, vendorId: cl?.id, categoryId: pr?.categoryId, sellType: pr?.sellType } });
               if(!vc) return res.status(200).json({ success: false, data: null, msg: `Voucher quota exhausted` });
               // Send SMS to Buyer
               const msg = `Hi! AUCC Voucher info are, Serial: ${vc?.serial} Pin: ${vc?.pin} Goto https://portal.aucc.edu.gh to apply!`;
               //const send = await sms(buyerPhone, msg);
               let send = { code: 1001 };
               const ins = await fms.transaction.create({ 
                  data: {
                     ... data,
                     activityFinanceVoucher: {
                        createMany: { 
                           data: { serial: vc.serial, pin: vc?.pin, buyerName, buyerPhone, admissionId: sessionId, smsCode: send?.code || '0000' }
                        }
                     }
                  } 
               });
               
               if (ins) {
                  // Update Voucher with details
                  const vs:any = await fms.voucher.update({
                     where: { serial: vc?.serial },
                     data: { applicantName: buyerName, applicantPhone: buyerPhone, soldAt: new Date() }
                  });
                  // Send Response
                  return res.status(200).json({ success: true, data: { voucherSerial: vc?.serial, voucherPin: vc?.pin, buyerName, buyerPhone, transId: ins?.id, serviceId } });
               }
            
           } else {
               const vc:any = await fms.activityFinanceVoucher.findFirst({ where: { transactId: tr.id } });
               if(vc){
                 const msg = `Hi! AUCC Voucher info are, Serial: ${vc?.serial} Pin: ${vc?.pin} Goto https://portal.aucc.edu.gh to apply!`;
                 //const send = await sms(buyerPhone, msg);
                 let send = { code: 1001 };
                 await fms.activityFinanceVoucher.update({ where: { id: vc.id }, data: { smsCode: send?.code } })
                 return res.status(200).json({
                  success: true,
                     data: {
                        voucherSerial: vc?.serial,
                        voucherPin: vc?.pin,
                        buyerName,
                        buyerPhone,
                        transId: tr?.id,
                        serviceId,
                     },
                  });
               }
               return res.status(200).json({ success: false, data: null, msg: `Transaction failed` });
           }
   
         /* OTHER PAYMENT SERVICE (ACADEMIC FEES, RESIT, GRADUATION, ATTESTATION, PROFICIENCY, TRANSCRIPT, LATE FINE ) */
         } else {
            /* PAY FOR SERVICES */
            const st:any = await fms.student.findFirst({ where: { OR: [ { id: studentId }, { indexno: studentId } ] } });
            if(!tr){
               const narrative = `Payment of ${serviceId == 8 ? 'Graduation' : serviceId == 3 ? 'Resit' : serviceId == 8 ? 'Late Registration' : 'Academic' } Fees`
               const ins = await fms.transaction.create({ 
                  data: {
                     ... data,
                     ... serviceId && [2,3,4,8].includes(serviceId) && ({ studentAccount: { createMany: {  data: { studentId, narrative, currency, amount: (-1 * amountPaid), type: 'PAYMENT' }  }}}),
                  } 
               })

               if(ins) {
                  if([2,3,4,8].includes(serviceId)){
                     const bal:any = await fms.studentAccount.aggregate({ _sum: { amount: true }, where: { studentId } });
                     await fms.student.update({ where: { id: studentId }, data: { accountNet: bal?._sum?.amount || 0 } })
                  }
                  /* For Resit Payments */
                  if (serviceId == 3) {
                     // Retire Number of Resit Papers
                     const resit_charge: any = await fms.servicefee.findUnique({ where: { transtypeId: Number(serviceId) } });
                     const pay_count = Math.floor(( st?.entryGroup == 'INT' ? resit_charge?.amountInUsd : resit_charge?.amountInGhc) % amountPaid);
                     const resits:any = await fms.resit.findMany({ where: { indexno: st?.indexno }, take: pay_count })
                     const filters:any = resits?.map((r:any) => ({ indexno: r.indexno }))
                     // Update Paid Status of resit_data or papers
                     const ups = await fms.resit.updateMany({ where: { OR: filters }, data: { paid: true } })
                  }
                  // Return Response
                  return res.status(200).json({success: true, data: { transId: ins?.id, studentId, serviceId } });
               } else {
                  return res.status(200).json({ success: false, data: null, msg: `Transaction failed` });
               }
            } else {
               return res.status(200).json({success: true, data: { transId: tr?.id, studentId, serviceId } });
            }
         }
         
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   /* Student Accounts & Debtors */

   async fetchAccounts(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition:any = {}
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { id: { contains: keyword } },
                  { indexno: { contains: keyword } },
                  { fname: { contains: keyword } },
                  { lname: { contains: keyword } },
               ]
            }
         }
         const resp = await fms.$transaction([
            fms.student.count({
               ...(searchCondition),
            }),
            fms.student.findMany({
               ...(searchCondition),
               include: { program: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);

         console.log(resp)
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async fetchDebts(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition:any = { where: { accountNet: { gt: 0 } } }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { id: { contains: keyword } },
                  { indexno: { contains: keyword } },
                  { fname: { contains: keyword } },
                  { lname: { contains: keyword } },
               ],
               AND: [{ accountNet: { gt: 0 } }]
            }
         }
         const resp = await fms.$transaction([
            fms.student.count({
               ...(searchCondition),
            }),
            fms.student.findMany({
               ...(searchCondition),
               include: { program: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async retireAccount(req: Request,res: Response) {
      try {
         const st = await fms.student.findFirst({
            where: { OR: [ { id: req.params.id }, { indexno: req.params.id } ] }
         })
         if(st){
            const bal:any = await fms.studentAccount.aggregate({ _sum: { amount: true }, where: { studentId: st?.id } });
            const ups = await fms.student.update({ where: { id: st?.id }, data: { accountNet: bal?._sum?.amount }})
            // Return New Balance
            res.status(200).json(ups?.accountNet)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }


   /* Service charges */
   async fetchServices(req: Request,res: Response) {
   const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
   const offset = (page - 1) * pageSize;
   let searchCondition = { }
   try {
      if(keyword) searchCondition = { 
         where: { 
            OR: [
               { title: { contains: keyword } },
               { transtype: { title: { contains: keyword }} },
            ],
         }
      }
      const resp = await fms.$transaction([
         fms.servicefee.count({
            ...(searchCondition),
         }),
         fms.servicefee.findMany({
            ...(searchCondition),
            include: { transtype: true },
            skip: offset,
            take: Number(pageSize),
         })
      ]);
      
      if(resp && resp[1]?.length){
         res.status(200).json({
            totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
            totalData: resp[1]?.length,
            data: resp[1],
         })
      } else {
         res.status(204).json({ message: `no records found` })
      }
   } catch (error: any) {
      console.log(error)
      return res.status(500).json({ message: error.message }) 
   }
   }

   async fetchService(req: Request,res: Response) {
      try {
         const resp = await fms.servicefee.findUnique({
            where: { transtypeId: Number(req.params.id) }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no record found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async postService(req: Request,res: Response) {
      try {
         const { transtypeId } = req.body
         delete req.body.transtypeId; delete req.body.transtypeId;
         const resp = await fms.servicefee.create({
            data: {
               ... req.body,
               ... transtypeId && ({ transtype: { connect: { id: transtypeId }}}),
            }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `no records found` })
         }
         
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async updateService(req: Request,res: Response) {
      try {
         const { transtypeId } = req.body
         delete req.body.transtypeId; delete req.body.transtypeId;
         const resp = await fms.servicefee.update({
            where: { 
              transtypeId: Number(req.params.id) 
            },
            data: {
              ... req.body,
              ... transtypeId && ({ transtype: { connect: { id: transtypeId }}}),
            }
         })
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }

   async deleteService(req: Request,res: Response) {
      try {
         const resp = await fms.servicefee.delete({ where: {  transtypeId: Number(req.params.id)  }})
         if(resp){
            res.status(200).json(resp)
         } else {
            res.status(204).json({ message: `No records deleted` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
   }


   /* Voucher Costs */
   async fetchVsales(req: Request,res: Response) {
      const { page = 1, pageSize = 9, keyword = '' } :any = req.query;
      const offset = (page - 1) * pageSize;
      let searchCondition = { }
      try {
         if(keyword) searchCondition = { 
            where: { 
               OR: [
                  { title: { contains: keyword } },
                  { category: { title: { contains: keyword }} },
               ],
            }
         }
         const resp = await fms.$transaction([
            fms.amsPrice.count({
               ...(searchCondition),
            }),
            fms.amsPrice.findMany({
               ...(searchCondition),
               include: { category: true },
               skip: offset,
               take: Number(pageSize),
            })
         ]);
         
         if(resp && resp[1]?.length){
            res.status(200).json({
               totalPages: Math.ceil(resp[0]/pageSize) ?? 0,
               totalData: resp[1]?.length,
               data: resp[1],
            })
         } else {
            res.status(204).json({ message: `no records found` })
         }
      } catch (error: any) {
         console.log(error)
         return res.status(500).json({ message: error.message }) 
      }
      }
   
      async fetchVsale(req: Request,res: Response) {
         try {
            const resp = await fms.amsPrice.findUnique({
               where: { id: req.params.id }
            })
            if(resp){
               res.status(200).json(resp)
            } else {
               res.status(204).json({ message: `no record found` })
            }
         } catch (error: any) {
            console.log(error)
            return res.status(500).json({ message: error.message }) 
         }
      }
   
      async postVsale(req: Request,res: Response) {
         try {
            const { categoryId } = req.body
            delete req.body.categoryId; 
            const resp = await fms.servicefee.create({
               data: {
                 ... req.body,
                 ... categoryId && ({ category: { connect: { id: categoryId }}}),
               }
            })
            if(resp){
               res.status(200).json(resp)
            } else {
               res.status(204).json({ message: `no records found` })
            }
            
         } catch (error: any) {
            console.log(error)
            return res.status(500).json({ message: error.message }) 
         }
      }
   
      async updateVsale(req: Request,res: Response) {
         try {
            const { categoryId } = req.body
            delete req.body.categoryId; 
            const resp = await fms.amsPrice.update({
               where: { id: req.params.id },
               data: {
                 ... req.body,
                 ... categoryId && ({ category: { connect: { id: categoryId }}}),
               }
            })
            if(resp){
               res.status(200).json(resp)
            } else {
               res.status(204).json({ message: `No records found` })
            }
         } catch (error: any) {
            console.log(error)
            return res.status(500).json({ message: error.message }) 
         }
      }
   
      async deleteVsale(req: Request,res: Response) {
         try {
            const resp = await fms.amsPrice.delete({ where: { id: req.params.id } })
            if(resp){
               res.status(200).json(resp)
            } else {
               res.status(204).json({ message: `No records deleted` })
            }
         } catch (error: any) {
            console.log(error)
            return res.status(500).json({ message: error.message }) 
         }
      }
   

}