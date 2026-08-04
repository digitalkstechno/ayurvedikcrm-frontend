"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../context/ToastContext";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { Input } from "../../components/common/Input";
import { Select } from "../../components/common/Select";
import { Button } from "../../components/common/Button";
import { FiTrash2, FiArrowLeft } from "react-icons/fi";
import { fetchUsers } from "../../services/userService";
import { fetchProducts } from "../../services/productService";
import { fetchStatuses } from "../../services/statusService";
import { fetchReasonToCalls } from "../../services/reasonToCallService";
import { createLeadApi } from "../../services/leadService";
import { createOrderApi } from "../../services/orderService";

interface SelectedProductRow {
  productId: string;
  name: string;
  amount: number;
  quantity: number;
}

export default function AddLeadPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [couriers] = useState<any[]>([
    { id: "1", name: "Delhivery" },
    { id: "2", name: "BlueDart" },
    { id: "3", name: "XpressBees" },
    { id: "4", name: "DHL Express" }
  ]);
  const [statusesOptions, setStatusesOptions] = useState<any[]>([]);
  const [reasonCallOptions, setReasonCallOptions] = useState<any[]>([]);
  const toast = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(true);

  React.useEffect(() => {
    const loggedInUser = getAuthenticatedUser();
    let isUserAdmin = true;
    if (loggedInUser) {
      setCurrentUser(loggedInUser);
      isUserAdmin = loggedInUser?.roles?.some((r: string) => r.toLowerCase().includes('admin')) || loggedInUser?.email === 'superadmin@gmail.com';
      setIsAdmin(isUserAdmin);
    }

    const loadMasterData = async () => {
      try {
        const [usersRes, prodsRes, statusRes, reasonRes] = await Promise.all([
          fetchUsers({ page: 1, limit: 100 }),
          fetchProducts({ page: 1, limit: 100 }),
          fetchStatuses({ page: 1, limit: 100 }),
          fetchReasonToCalls({ page: 1, limit: 100 })
        ]);
        setUsers(usersRes.data);
        setProducts(prodsRes.data);
        setStatusesOptions(statusRes.data);
        setReasonCallOptions(reasonRes.data);
        if (loggedInUser && !isUserAdmin) {
          setAssignee(loggedInUser._id || loggedInUser.id || "");
        } else if (usersRes.data.length > 0) {
          setAssignee((usersRes.data[0] as any)._id || (usersRes.data[0] as any).id);
        }
        if (prodsRes.data.length > 0) {
          setCurrentSelectedProductId((prodsRes.data[0] as any)._id || (prodsRes.data[0] as any).id);
        }
        if (statusRes.data.length > 0) {
          setStatus((statusRes.data[0] as any)._id || (statusRes.data[0] as any).id);
        }
        if (reasonRes.data.length > 0) {
          setStatusTwo((reasonRes.data[0] as any)._id || (reasonRes.data[0] as any).id);
        }
      } catch (err) {
        console.error("Error loading master data", err);
      }
    };
    loadMasterData();
  }, []);

  const [isAddingLead, setIsAddingLead] = useState(false);

  // Form states — IDs stored
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");         // statusId
  const [statusTwo, setStatusTwo] = useState("");   // reasonToCallId
  const [noteText, setNoteText] = useState("");
  const [assignee, setAssignee] = useState("");     // userId
  const [orderStatus, setOrderStatus] = useState(false);
  const [reminder, setReminder] = useState("");

  // Product Selection Table States
  const [modalSelectedProducts, setModalSelectedProducts] = useState<SelectedProductRow[]>([]);
  const [currentSelectedProductId, setCurrentSelectedProductId] = useState("");

  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [selectedCourier, setSelectedCourier] = useState("Delhivery");
  const [transactionId, setTransactionId] = useState("");
  const [deliveryNo, setDeliveryNo] = useState("");

  const handleAddProduct = () => {
    if (!currentSelectedProductId) return;
    const prod = products.find(p => (p._id || p.id) === currentSelectedProductId);
    if (!prod) return;

    if (modalSelectedProducts.some(p => p.productId === currentSelectedProductId)) {
      toast.warning("Product already added to list!");
      return;
    }

    setModalSelectedProducts([
      ...modalSelectedProducts,
      { productId: prod._id || prod.id, name: prod.name, amount: prod.amount, quantity: 1 }
    ]);
  };

  const handleRemoveProduct = (productId: string) => {
    setModalSelectedProducts(modalSelectedProducts.filter(p => p.productId !== productId));
  };

  const handleQtyChange = (productId: string, qty: number) => {
    setModalSelectedProducts(
      modalSelectedProducts.map(p => p.productId === productId ? { ...p, quantity: Math.max(1, qty) } : p)
    );
  };

  const totalAmount = modalSelectedProducts.reduce((sum, p) => sum + p.amount * p.quantity, 0);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length !== 10) {
      toast.warning("Phone number must be exactly 10 digits!");
      return;
    }

    setIsAddingLead(true);

    const leadPayload = {
      name,
      phone_number: phone,
      // Products as separate structured array
      products: modalSelectedProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        amount: p.amount,
        quantity: p.quantity
      })),
      // Kept for display/backward compat
      product: modalSelectedProducts.map(p => p.name).join(", "),
      amount: totalAmount,
      quantity: modalSelectedProducts.reduce((sum, p) => sum + p.quantity, 0),
      // IDs for relational fields
      assgin: assignee,
      status: status,
      reason_call: statusTwo,
      note: noteText,
      reminder: reminder,
      orderStatus: orderStatus,
      paymentType: orderStatus ? paymentType : undefined,
      courier: orderStatus ? selectedCourier : undefined,
      transactionId: orderStatus ? transactionId : undefined,
      deliveryNo: orderStatus ? deliveryNo : undefined
    };

    try {
      const createdLead = await createLeadApi(leadPayload as any);
      toast.success(`Lead created successfully for ${name || "Customer"}!`);

      // If "Convert to Order automatically" is checked, create an order
      if (orderStatus) {
        try {
          await createOrderApi({
            leadId: (createdLead as any)._id,
            name,
            phone_number: phone,
            products: modalSelectedProducts.map(p => ({
              productId: p.productId,
              name: p.name,
              amount: p.amount,
              quantity: p.quantity
            })),
            product: modalSelectedProducts.map(p => p.name).join(", "),
            amount: totalAmount,
            quantity: modalSelectedProducts.reduce((sum, p) => sum + p.quantity, 0),
            grandTotal: totalAmount,
            paymentType,
            courier: selectedCourier,
            assginTo: assignee,
            transactionId: transactionId || "TXN-AUTO",
            delivery_no: deliveryNo || undefined,
            status: "Dispatched"
          });
          toast.success("Order created automatically!");
        } catch (orderErr: any) {
          toast.error("Lead saved but order creation failed: " + (orderErr.response?.data?.message || ""));
        }
      }

      setIsAddingLead(false);
      router.push("/lead-list");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add lead");
      setIsAddingLead(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white  p-6 border border-zinc-200  rounded-lg shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-zinc-100  pb-4">
          <button 
            onClick={() => router.push("/lead-list")}
            className="p-1.5 rounded-lg hover:bg-zinc-100  text-zinc-500 transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-zinc-800 ">
              Add New Lead
            </h2>
            <p className="text-xs text-zinc-500 font-medium">Fill out the details to register a new lead in the system.</p>
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-6 text-left">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Name" />
            <Input
              label="Phone Number"
              type="text"
              isMobile
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const form = e.currentTarget.form;
                  if (form) {
                    const elements = Array.from(form.elements) as HTMLElement[];
                    const index = elements.indexOf(e.currentTarget);
                    if (index > -1 && index + 1 < elements.length) {
                      elements[index + 1].focus();
                    }
                  }
                }
              }}
              placeholder="10-digit number"
              required
            />
            <Select
              label="Reason Call"
              value={statusTwo}
              onChange={(e) => setStatusTwo(e.target.value)}
              options={[
                { value: "", label: "Select Reason" },
                ...reasonCallOptions.map(r => ({ value: r._id || r.id, label: r.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "", label: "Select Status" },
                ...statusesOptions.map(s => ({ value: s._id || s.id, label: s.name }))
              ]}
            />
            <Select
              label="Assgin By"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              options={[
                { value: "", label: "Select User" },
                ...(isAdmin
                  ? users
                  : users.filter(u => u._id === currentUser?._id || u.id === currentUser?._id || u._id === currentUser?.id)
                ).map(u => ({ value: u._id || u.id, label: u.name }))
              ]}
            />
            <Input label="Note" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Enter Note" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700  cursor-pointer mt-5">
              <input
                type="checkbox"
                checked={orderStatus}
                onChange={(e) => setOrderStatus(e.target.checked)}
                className="w-4 h-4 text-primary-teal rounded-lg border-zinc-300"
              />
              Convert to Order automatically
            </label>
            <Input label="Reminder" type="date" value={reminder} onChange={(e) => setReminder(e.target.value)} />
          </div>

          {/* Convert to Order fields shown when checkbox is checked */}
          {orderStatus && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-6 bg-red-50/30 dark:bg-red-950/10 rounded-xl border-2 border-red-500/20 items-start shadow-soft transition-all duration-300 animate-fade-in">
              <div className="space-y-2 text-left">
                <label className="text-[13px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Payment Type</label>
                <div className="flex items-center gap-5 mt-3">
                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer font-medium hover:text-red-600 transition-colors">
                    <input
                      type="radio"
                      name="addPagePaymentType"
                      value="COD"
                      checked={paymentType === 'COD'}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-4.5 h-4.5 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                    />
                    COD
                  </label>
                  <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer font-medium hover:text-red-600 transition-colors">
                    <input
                      type="radio"
                      name="addPagePaymentType"
                      value="Prepaid"
                      checked={paymentType === 'Prepaid'}
                      onChange={(e) => setPaymentType(e.target.value as any)}
                      className="w-4.5 h-4.5 text-red-600 focus:ring-red-500 accent-red-600 cursor-pointer"
                    />
                    Prepaid
                  </label>
                </div>
              </div>
              <Select
                label="Courier Partner"
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                menuPortalTarget={true}
                options={couriers.map(c => ({ value: c.name, label: c.name }))}
              />
              <Input
                label="Transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. TXN90283019"
              />
              <Input
                label="Delivery No"
                value={deliveryNo}
                onChange={(e) => setDeliveryNo(e.target.value)}
                placeholder="e.g. 987654321"
              />
            </div>
          )}

          <div className="border-t border-zinc-150  pt-4 space-y-3 text-left">
            <h4 className="text-sm font-bold text-zinc-700 ">Select Products</h4>
            <div className="flex gap-2.5 items-end">
              <div className="flex-1">
                <Select
                  value={currentSelectedProductId}
                  onChange={(e) => setCurrentSelectedProductId(e.target.value)}
                  options={[
                    { value: "", label: "Select a product" },
                    ...products.map(p => ({ value: p._id || p.id, label: `${p.name} (₹${p.amount})` }))
                  ]}
                />
              </div>
              <Button type="button" variant="success" onClick={handleAddProduct}>
                Add Product
              </Button>
            </div>
          </div>

          <div className="space-y-3 text-left">
            <h4 className="text-sm font-bold text-zinc-700 ">Selected Products</h4>
            <div className="border border-zinc-200  rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-50  border-b border-zinc-200  font-semibold text-zinc-500 uppercase">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Subtotal</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-150 ">
                  {modalSelectedProducts.length > 0 ? (
                    modalSelectedProducts.map((row) => (
                      <tr key={row.productId}>
                        <td className="p-3 font-medium text-zinc-800 ">{row.name}</td>
                        <td className="p-3 font-medium text-zinc-700 ">₹{row.amount}</td>
                        <td className="p-3 w-24">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleQtyChange(row.productId, Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-zinc-50  border border-zinc-200  rounded-lg focus:ring-1 focus:ring-primary-teal outline-none text-center"
                          />
                        </td>
                        <td className="p-3 font-black text-zinc-800 ">₹{row.amount * row.quantity}</td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(row.productId)}
                            className="p-1.5 bg-rose-500 hover:bg-rose-400 text-white rounded-lg transition-all shadow-sm"
                            title="Remove Product"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-zinc-400 font-medium">
                        No products selected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-zinc-150  pt-4 mt-2">
            <span className="text-sm font-black text-zinc-700 ">
              Total Amount: ₹{totalAmount}
            </span>
            <div className="flex gap-3">
              <Button type="button" variant="secondary" onClick={() => router.push("/lead-list")}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isAddingLead}>
                Save Lead
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
