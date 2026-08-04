import React, { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { Input } from "../common/Input";
import { Select } from "../common/Select";
import { getAuthenticatedUser } from "../../utils/authUtils";
import { Button } from "../common/Button";
import { FiEdit, FiTrash2 } from "react-icons/fi";
import { createLeadApi, updateLeadApi, fetchLeadById, fetchLatestLeadByPhone } from "../../services/leadService";
import { createOrderApi } from "../../services/orderService";
import { fetchCouriers } from "../../services/courierService";
import { useToast } from "../../context/ToastContext";

interface SelectedProductRow {
  productId: string;
  name: string;
  amount: number;
  quantity: number;
  subtotal: number;
}

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  activeLead?: any | null;
  users: any[];
  products: any[];
  statusesOptions: any[];
  reasonCallOptions: any[];
  defaultStatus?: string;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  activeLead,
  users,
  products,
  statusesOptions,
  reasonCallOptions,
  defaultStatus
}) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [statusTwo, setStatusTwo] = useState("");
  const [noteText, setNoteText] = useState("");
  const [remarkText, setRemarkText] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [assignee, setAssignee] = useState("");
  const [orderStatus, setOrderStatus] = useState(false);
  const [reminder, setReminder] = useState("");

  // Product Selection Table States
  const [modalSelectedProducts, setModalSelectedProducts] = useState<SelectedProductRow[]>([]);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [currentSelectedProductId, setCurrentSelectedProductId] = useState("");

  const [paymentType, setPaymentType] = useState<"COD" | "Prepaid">("COD");
  const [selectedCourier, setSelectedCourier] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [deliveryNo, setDeliveryNo] = useState("");
  const [couriers, setCouriers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isRepeatMode, setIsRepeatMode] = useState(false);

  useEffect(() => {
    if (isOpen && couriers.length === 0) {
      fetchCouriers({ limit: 100, page: 1 }).then(res => {
        if (res && res.data) setCouriers(res.data);
      }).catch(err => console.error(err));
    }

    if (isOpen && customers.length === 0) {
      import("../../services/customerService").then(mod => {
        mod.fetchCustomers().then(res => {
          if (res && res.data) setCustomers(res.data);
        });
      });
    }
  }, [isOpen, couriers.length, customers.length]);

  useEffect(() => {
    const parsed = getAuthenticatedUser();
    if (parsed) {
      setCurrentUser(parsed);
      setIsAdmin(parsed?.roles?.some((r: string) => r.toLowerCase().includes('admin') || r.toLowerCase() === 'superadmin') || parsed?.email === 'superadmin@gmail.com');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (activeLead) {
        // Edit Mode
        setIsLoading(true);
        fetchLeadById(activeLead.id).then((res: any) => {
          const fetchedData = res?.data || res;
          setName(fetchedData.name || "");
          setPhone(fetchedData.phone_number || "");
          setStatus(fetchedData.statusId || fetchedData.status?._id || fetchedData.status || "");
          setStatusTwo(fetchedData.reasonCallId || fetchedData.reason_call?._id || fetchedData.reason_call || "");
          setNoteText(fetchedData.note || "");
          setRemarkText(fetchedData.remark || "");
          setAge(fetchedData.age || "");
          setGender(fetchedData.gender || "");
          setAddress(fetchedData.address || "");
          setAssignee(fetchedData.assginId || fetchedData.assgin?._id || fetchedData.assgin || "");
          setReminder(fetchedData.reminderDate || fetchedData.reminder || "");
          const isOrder = Boolean(fetchedData.orderStatus) && fetchedData.orderStatus !== "false";
          setOrderStatus(isOrder);

          if (isOrder) {
            setPaymentType(fetchedData.paymentType || "COD");
            setSelectedCourier(fetchedData.courier || "");
            setTransactionId(fetchedData.transactionId || "");
            setDeliveryNo(fetchedData.deliveryNo || "");
          } else {
            setPaymentType("COD");
            setSelectedCourier("");
            setTransactionId("");
            setDeliveryNo("");
          }

          if (fetchedData.products && Array.isArray(fetchedData.products)) {
            setModalSelectedProducts(fetchedData.products.map((p: any) => ({
              productId: p.productId || p._id,
              name: p.name,
              amount: p.amount,
              quantity: p.quantity,
              subtotal: p.subtotal || (p.amount * p.quantity)
            })));
          } else {
            setModalSelectedProducts([]);
          }
        }).catch(err => {
          toast.error("Failed to fetch lead details");
          console.error(err);
        }).finally(() => {
          setIsLoading(false);
        });
      } else {
        // Add Mode
        setName("");
        setPhone("");
        setStatus(defaultStatus || statusesOptions[0]?._id || statusesOptions[0]?.id || "");
        setStatusTwo(reasonCallOptions[0]?._id || reasonCallOptions[0]?.id || "");
        setNoteText("");
        setRemarkText("");
        setAge("");
        setGender("");
        setAddress("");
        setReminder("");
        setOrderStatus(false);
        setPaymentType("COD");
        setSelectedCourier("");
        setTransactionId("");
        setDeliveryNo("");
        setModalSelectedProducts([]);
        setIsRepeatMode(false);

        // Handle Default Assignee
        if (currentUser) {
          if (!isAdmin) {
            const loggedInMember = users.find(u => u._id === currentUser?._id || u.id === currentUser?._id || (currentUser?.email && u.email?.toLowerCase() === currentUser?.email?.toLowerCase()));
            setAssignee(loggedInMember?._id || loggedInMember?.id || currentUser?._id || currentUser?.id || "");
          } else {
            setAssignee(users[0]?._id || users[0]?.id || "");
          }
        } else {
          setAssignee(users[0]?._id || users[0]?.id || "");
        }
      }
      setCurrentSelectedProductId(products[0]?._id || products[0]?.id || "");
    }
  }, [isOpen, activeLead, users, products, statusesOptions, reasonCallOptions, currentUser, defaultStatus]);

  // Auto-fill logic when phone number reaches 10 digits
  useEffect(() => {
    if (isOpen && !activeLead && phone && phone.length === 10) {
      const checkPreviousLead = async () => {
        try {
          const prevLead = await fetchLatestLeadByPhone(phone);
          if (prevLead) {
            setName(prevLead.name || "");
            setStatus((prevLead.status as any)?._id || prevLead.status || "");
            setStatusTwo((prevLead.reason_call as any)?._id || prevLead.reason_call || "");
            setNoteText(prevLead.note || "");
            setRemarkText(prevLead.remark || "");
            setAge(prevLead.age ? Number(prevLead.age) : "");
            setGender(prevLead.gender || "");
            setAddress(prevLead.address || "");

            // Assign Staff logic: Admin can see previous staff, Staff is forced to themselves
            if (isAdmin) {
              setAssignee((prevLead.assgin as any)?._id || prevLead.assgin || "");
            } else {
              setAssignee(currentUser?._id || currentUser?.id || "");
            }
            setOrderStatus(Boolean(prevLead.orderStatus));

            if (prevLead.products && prevLead.products.length > 0) {
              setModalSelectedProducts(prevLead.products.map((p: any) => ({
                productId: p.productId?._id || p.productId,
                name: p.productId?.name || p.name || "",
                amount: p.amount || 0,
                quantity: p.quantity || 1,
                subtotal: p.subtotal || 0
              })));
            } else {
              setModalSelectedProducts([]);
            }
            setIsRepeatMode(true);
            toast.success("Previous lead found. Form auto-filled and set to repeat mode.");
          } else {
            // Reset fields for new lead
            setIsRepeatMode(false);
            setStatus(defaultStatus || statusesOptions[0]?._id || statusesOptions[0]?.id || "");
            setStatusTwo(reasonCallOptions[0]?._id || reasonCallOptions[0]?.id || "");
            setNoteText("");
            setRemarkText("");
            setAge("");
            setGender("");
            setAddress("");
            setOrderStatus(false);
            setModalSelectedProducts([]);
            if (!isAdmin && currentUser) {
              setAssignee(currentUser?._id || currentUser?.id || "");
            }
          }
        } catch (error) {
          setIsRepeatMode(false);
          setStatus(defaultStatus || statusesOptions[0]?._id || statusesOptions[0]?.id || "");
          setStatusTwo(reasonCallOptions[0]?._id || reasonCallOptions[0]?.id || "");
          setNoteText("");
          setRemarkText("");
          setAge("");
          setGender("");
          setAddress("");
          setOrderStatus(false);
          setModalSelectedProducts([]);
          if (!isAdmin && currentUser) {
            setAssignee(currentUser?._id || currentUser?.id || "");
          }
        }
      };
      checkPreviousLead();
    } else if (isOpen && !activeLead && phone && phone.length < 10) {
      // Reset form if phone is incomplete
      setIsRepeatMode(false);
      setStatus(defaultStatus || statusesOptions[0]?._id || statusesOptions[0]?.id || "");
      setStatusTwo(reasonCallOptions[0]?._id || reasonCallOptions[0]?.id || "");
      setNoteText("");
      setRemarkText("");
      setAge("");
      setGender("");
      setAddress("");
      setOrderStatus(false);
      setModalSelectedProducts([]);
      if (!isAdmin && currentUser) {
        setAssignee(currentUser?._id || currentUser?.id || "");
      }
    }
  }, [phone, isOpen, activeLead]);

  const handleAddProduct = () => {
    if (!currentSelectedProductId) return;
    const prod = products.find(p => (p._id || p.id) === currentSelectedProductId);
    if (!prod) return;

    const existingIndex = modalSelectedProducts.findIndex(p => p.productId === currentSelectedProductId);
    if (existingIndex >= 0) {
      // Increment quantity instead of showing error
      const updated = [...modalSelectedProducts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].subtotal = updated[existingIndex].amount * updated[existingIndex].quantity;
      setModalSelectedProducts(updated);
      toast.success("Product quantity incremented!");
    } else {
      setModalSelectedProducts([
        ...modalSelectedProducts,
        {
          productId: prod._id || prod.id,
          name: prod.name,
          amount: prod.amount,
          quantity: 1,
          subtotal: prod.amount
        }
      ]);
      toast.success("Product added!");
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setModalSelectedProducts(modalSelectedProducts.filter(p => p.productId !== productId));
    setSelectedRowIds(prev => prev.filter(id => id !== productId));
  };

  const handleBulkRemove = () => {
    if (selectedRowIds.length === 0) return;
    setModalSelectedProducts(modalSelectedProducts.filter(p => !selectedRowIds.includes(p.productId)));
    setSelectedRowIds([]);
    toast.success(`${selectedRowIds.length} product(s) removed!`);
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.length === modalSelectedProducts.length && modalSelectedProducts.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(modalSelectedProducts.map(p => p.productId));
    }
  };

  const toggleSelectRow = (productId: string) => {
    setSelectedRowIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleQtyChange = (productId: string, qty: number) => {
    const safeQty = Math.max(1, qty);
    setModalSelectedProducts(
      modalSelectedProducts.map(p => p.productId === productId ? { ...p, quantity: safeQty, subtotal: safeQty * p.amount } : p)
    );
  };

  const totalAmount = modalSelectedProducts.reduce((sum, p) => sum + p.subtotal, 0);
  const totalQuantity = modalSelectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      toast.warning("Please enter Phone Number!");
      return;
    }
    if (phone.length !== 10) {
      toast.warning("Phone number must be exactly 10 digits!");
      return;
    }
    if (!noteText) {
      toast.warning("Please enter Inquiry Source!");
      return;
    }

    setIsLoading(true);

    const leadPayload: any = {
      name,
      phone_number: phone,
      products: modalSelectedProducts.map(p => ({
        productId: p.productId,
        name: p.name,
        amount: p.amount,
        quantity: p.quantity,
        subtotal: p.subtotal
      })),
      assgin: assignee,
      status: status,
      reason_call: statusTwo,
      note: noteText,
      remark: remarkText,
      age: age ? Number(age) : undefined,
      gender: gender || undefined,
      address: address || undefined,
      reminder: reminder,
      orderStatus: orderStatus,
      paymentType: orderStatus ? paymentType : undefined,
      courier: orderStatus ? selectedCourier : undefined,
      transactionId: orderStatus ? transactionId : undefined,
      deliveryNo: orderStatus ? deliveryNo : undefined,
      isRepeat: isRepeatMode
    };

    try {
      if (activeLead) {
        await updateLeadApi(activeLead.id, leadPayload);
        toast.success(`Lead updated successfully!`);
      } else {
        const createdLead = await createLeadApi(leadPayload);
        toast.success(`Lead created successfully!`);

        if (orderStatus) {
          try {
            await createOrderApi({
              leadId: (createdLead as any)._id,
              name: name || "Unknown",
              phone_number: phone,
              products: leadPayload.products,
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
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save lead");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={activeLead ? "Edit Lead Details" : "Add New Lead"} isLoading={isLoading} sizeClass="max-w-6xl">
      <form onSubmit={handleSubmit} className="space-y-6 text-left max-w-5xl mx-auto pr-1">
        {/* <p className="text-sm text-text-secondary font-semibold">Fill out the details to {activeLead ? 'update the' : 'register a new'} lead in the system.</p> */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter Name"
            />
          </div>
          <div>
            <Input
              label="Phone Number"
              type="text"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 10) {
                  setPhone(val);
                }
              }}
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
              required
              placeholder="Enter 10-digit Phone Number"
            />
          </div>
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
            label="Assign Staff"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            disabled={!isAdmin}
            options={[
              { value: "", label: "Select User" },
              ...(isAdmin
                ? users
                : users.filter(u => u._id === currentUser?._id || u.id === currentUser?._id || (currentUser?.email && u.email?.toLowerCase() === currentUser?.email?.toLowerCase()))
              ).map(u => ({ value: u._id || u.id, label: u.name }))
            ]}
          />
          <Select
            label="Inquiry Source"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            options={[
              { value: "", label: "Select Inquiry Source" },
              { value: "Whatsapp Message", label: "Whatsapp Message" },
              { value: "Call", label: "Call" }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Age"
            type="number"
            value={age === "" ? "" : String(age)}
            onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
            placeholder="Age"
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={[
              { value: "", label: "Select Gender" },
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" }
            ]}
          />
        </div>

        <div className="w-full flex flex-col gap-1.5 text-left">
          <label className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider flex gap-1">Remark</label>
          <textarea
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Enter Remark"
            rows={3}
            className="w-full px-4 py-2.5 text-base bg-card-bg border border-border-ui text-text-primary rounded-lg transition-all duration-200 outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/30 placeholder:text-text-secondary/50 resize-y"
          />
        </div>

        <div className="w-full flex flex-col gap-1.5 text-left">
          <label className="text-sm font-semibold text-[var(--muted)] uppercase tracking-wider flex gap-1">Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter full address"
            rows={3}
            className="w-full px-4 py-2.5 text-base bg-card-bg border border-border-ui text-text-primary rounded-lg transition-all duration-200 outline-none focus:border-primary-teal focus:ring-1 focus:ring-primary-teal/30 placeholder:text-text-secondary/50 resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer mt-4">
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

        {orderStatus && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 p-6 bg-gradient-subtle rounded-xl border-2 border-primary-teal/20 items-start shadow-soft transition-all duration-300 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[13px] font-bold text-primary-teal uppercase tracking-wide">Payment Type</label>
              <div className="flex items-center gap-5 mt-3">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer font-medium hover:text-primary-teal transition-colors">
                  <input
                    type="radio"
                    name="modalPaymentType"
                    value="COD"
                    checked={paymentType === 'COD'}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-4.5 h-4.5 text-primary-teal focus:ring-primary-teal accent-primary cursor-pointer"
                  />
                  COD Discount
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer font-medium hover:text-primary-teal transition-colors">
                  <input
                    type="radio"
                    name="modalPaymentType"
                    value="Prepaid"
                    checked={paymentType === 'Prepaid'}
                    onChange={(e) => setPaymentType(e.target.value as any)}
                    className="w-4.5 h-4.5 text-primary-teal focus:ring-primary-teal accent-primary cursor-pointer"
                  />
                  Prepaid Discount
                </label>
              </div>
            </div>
            <Select
              label="Courier Partner"
              value={selectedCourier}
              onChange={(e) => setSelectedCourier(e.target.value)}
              menuPortalTarget={true}
              options={[
                { value: "", label: "Select Courier Partner" },
                ...couriers.map(c => ({ value: c.name, label: c.name }))
              ]}
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

        <div className="border-t border-zinc-150 pt-6 space-y-4">
          <h4 className="text-lg font-bold text-zinc-800">Choose Products to Add</h4>
          <div className="flex gap-4 items-end bg-zinc-50 p-4 rounded-xl border border-zinc-200">
            <div className="flex-1">
              <Select
                label="Search & Select Product"
                value={currentSelectedProductId}
                onChange={(e) => setCurrentSelectedProductId(e.target.value)}
                options={[
                  { value: "", label: "Select a product" },
                  ...products.map(p => ({ value: p._id || p.id, label: `${p.name} (₹${p.amount})` }))
                ]}
              />
            </div>
            <Button type="button" variant="success" size="lg" onClick={handleAddProduct} className="mb-1">
              Add Product
            </Button>
          </div>
        </div>

        <div className="space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-zinc-800">
              Selected Products
            </h4>
            {selectedRowIds.length > 0 && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleBulkRemove}
                className="px-4 py-1.5"
              >
                Remove Selected ({selectedRowIds.length})
              </Button>
            )}
          </div>

          <div className="border border-zinc-200 overflow-hidden rounded-xl shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-100/80 border-b border-zinc-200">
                  <th className="p-3 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedRowIds.length === modalSelectedProducts.length && modalSelectedProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-primary-teal rounded-md border-zinc-300 focus:ring-primary-teal cursor-pointer"
                    />
                  </th>
                  <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                    Product Name
                  </th>
                  <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                    Amount
                  </th>
                  <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                    Quantity
                  </th>
                  <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-left">
                    Subtotal
                  </th>
                  <th className="p-3 text-xs font-semibold text-zinc-700 uppercase tracking-wide text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-200">
                {modalSelectedProducts.length > 0 ? (
                  modalSelectedProducts.map((row) => (
                    <tr
                      key={row.productId}
                      className={`hover:bg-zinc-50/80 transition-colors ${selectedRowIds.includes(row.productId) ? 'bg-zinc-50' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(row.productId)}
                          onChange={() => toggleSelectRow(row.productId)}
                          className="w-4 h-4 text-primary-teal rounded-md border-zinc-300 focus:ring-primary-teal cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-medium text-zinc-800 text-sm">
                        {row.name}
                      </td>

                      <td className="p-3 font-medium text-zinc-700 text-sm">
                        ₹{row.amount}
                      </td>

                      <td className="p-3 w-28">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleQtyChange(row.productId, Number(e.target.value))
                          }
                          className="w-20 px-2 py-1 text-sm font-medium bg-white border border-zinc-200 rounded-lg focus:ring-1 focus:ring-primary-teal/20 focus:border-primary-teal outline-none text-center shadow-sm"
                        />
                      </td>

                      <td className="p-3 font-bold text-zinc-900 text-sm">
                        ₹{row.subtotal}
                      </td>

                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(row.productId)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all duration-200"
                          title="Remove Product"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-sm text-zinc-400 font-medium"
                    >
                      No products selected
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-150 pt-4 mt-2">
          <span className="text-sm font-bold text-zinc-800 bg-zinc-100 px-4 py-2 rounded-lg border border-zinc-200 shadow-sm">
            Total Amount: <span className="text-primary-teal ml-1">₹{totalAmount.toLocaleString()}</span>
          </span>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Save Lead
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
