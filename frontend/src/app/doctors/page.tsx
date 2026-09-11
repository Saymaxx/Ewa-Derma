'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { getCachedData, setCachedData, clearCache, CACHE_KEYS, DEFAULT_TTLS } from '@/lib/cache';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatDoctorName } from '@/lib/format-doctor';
import {
  Stethoscope,
  Clock,
  Calendar,
  IndianRupee,
  Award,
  Edit2,
  Trash2,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
  UserPlus,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

export default function DoctorsPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add Doctor Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAddSubmitting, setIsAddSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    specialization: 'Dermatologist',
    qualification: 'MBBS, MD (Dermatology)',
    regNumber: '',
    consultationFee: 500,
    workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
    workingHours: '10:00-19:00',
  });

  // Edit Modal State
  const [editDoctor, setEditDoctor] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    qualification: '',
    regNumber: '',
    consultationFee: 500,
    workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    workingHours: '10:00-19:00',
    isActive: true,
  });

  // Delete Modal State
  const [deleteDoctor, setDeleteDoctor] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  const fetchDoctors = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedData<any[]>(CACHE_KEYS.DOCTORS_LIST);
      if (cached) {
        setDoctors(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await api.get('/doctors');
      const rawDoctors = res?.data?.data ?? res?.data;
      const list = Array.isArray(rawDoctors) ? rawDoctors : [];
      setDoctors(list);
      setCachedData(CACHE_KEYS.DOCTORS_LIST, list, DEFAULT_TTLS.DOCTORS);
    } catch {
      showToast('Failed to load doctors roster', 'error');
      setDoctors([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName.trim() || !addForm.lastName.trim() || !addForm.email.trim() || !addForm.specialization.trim()) {
      showToast('First name, last name, email, and specialization are required', 'warning', 'Missing Fields');
      return;
    }

    setIsAddSubmitting(true);
    try {
      const payload = {
        firstName: addForm.firstName.trim(),
        lastName: addForm.lastName.trim(),
        email: addForm.email.toLowerCase().trim(),
        phone: addForm.phone.trim() || undefined,
        password: addForm.password.trim() || 'Doctor@123',
        specialization: addForm.specialization.trim(),
        qualification: addForm.qualification.trim() || undefined,
        regNumber: addForm.regNumber.trim() || undefined,
        consultationFee: Number(addForm.consultationFee) || 500,
        workingDays: addForm.workingDays.trim() || 'Mon,Tue,Wed,Thu,Fri,Sat',
        workingHours: addForm.workingHours.trim() || '10:00-19:00',
      };

      await api.post('/doctors', payload);
      showToast(`Dr. ${addForm.firstName} ${addForm.lastName} registered successfully.`, 'success', 'Doctor Added');
      clearCache(CACHE_KEYS.DOCTORS_LIST);
      setIsAddOpen(false);
      setAddForm({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        specialization: 'Dermatologist',
        qualification: 'MBBS, MD (Dermatology)',
        regNumber: '',
        consultationFee: 500,
        workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
        workingHours: '10:00-19:00',
      });
      fetchDoctors(true);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Creation Failed');
    } finally {
      setIsAddSubmitting(false);
    }
  };

  const openEditModal = (doc: any) => {
    setEditDoctor(doc);
    setEditForm({
      firstName: doc.user?.firstName || '',
      lastName: doc.user?.lastName || '',
      email: doc.user?.email || '',
      phone: doc.user?.phoneNumber || '',
      specialization: doc.specialization || '',
      qualification: doc.qualification || '',
      regNumber: doc.regNumber || '',
      consultationFee: Number(doc.consultationFee) || 500,
      workingDays: doc.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      workingHours: doc.workingHours || '10:00-19:00',
      isActive: doc.isActive !== false,
    });
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoctor) return;

    if (!editForm.firstName.trim() || !editForm.lastName.trim() || !editForm.specialization.trim()) {
      showToast('First name, last name, and specialization are required', 'warning', 'Missing Fields');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        email: editForm.email.toLowerCase().trim() || undefined,
        phone: editForm.phone.trim() || undefined,
        specialization: editForm.specialization.trim(),
        qualification: editForm.qualification.trim() || undefined,
        regNumber: editForm.regNumber.trim() || undefined,
        consultationFee: Number(editForm.consultationFee) || 500,
        workingDays: editForm.workingDays.trim(),
        workingHours: editForm.workingHours.trim(),
        isActive: editForm.isActive,
      };

      await api.patch(`/doctors/${editDoctor.id}`, payload);
      showToast('Doctor profile and schedule updated successfully', 'success', 'Profile Updated');
      clearCache(CACHE_KEYS.DOCTORS_LIST);
      setEditDoctor(null);
      fetchDoctors(true);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeleteDoctor = async () => {
    if (!deleteDoctor) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/doctors/${deleteDoctor.id}`);
      showToast(`${formatDoctorName(deleteDoctor.user?.firstName, deleteDoctor.user?.lastName)} profile deactivated.`, 'success', 'Doctor Deactivated');
      clearCache(CACHE_KEYS.DOCTORS_LIST);
      setDeleteDoctor(null);
      fetchDoctors(true);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Deactivation Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const isAdmin = hasRole('ADMIN');
  const doctorList = Array.isArray(doctors) ? doctors : [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Doctor Roster & Schedules
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Clinical doctor profiles, consultation pricing, credentials, and weekly availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="primary" size="md">
            {doctorList.length} Doctors
          </Badge>
          {isAdmin && (
            <Button
              variant="primary"
              leftIcon={<UserPlus className="w-4 h-4" />}
              onClick={() => setIsAddOpen(true)}
            >
              Add New Doctor
            </Button>
          )}
        </div>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      ) : doctorList.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <Stethoscope className="w-10 h-10 text-text-muted mx-auto" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">No doctors found in roster</p>
              <p className="text-xs text-text-secondary">Get started by onboarding a new doctor profile.</p>
            </div>
            {isAdmin && (
              <Button size="sm" variant="primary" onClick={() => setIsAddOpen(true)}>
                Add Doctor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctorList.map((doc) => (
            <Card key={doc.id} accentTop>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-lg shrink-0">
                    {doc.user?.firstName?.[0]}
                    {doc.user?.lastName?.[0]}
                  </div>
                  <div>
                    <CardTitle>
                      {formatDoctorName(doc.user?.firstName, doc.user?.lastName)}
                    </CardTitle>
                    <span className="text-xs text-accent font-semibold block">
                      {doc.specialization}
                    </span>
                    {doc.user?.email && (
                      <span className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" />
                        {doc.user?.email}
                      </span>
                    )}
                  </div>
                </div>

                <Badge variant={doc.isActive ? 'success' : 'default'} size="sm" dot>
                  {doc.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>

              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface border border-surface-border">
                  <div>
                    <span className="text-text-muted block">Qualifications</span>
                    <span className="font-semibold text-text-primary">
                      {doc.qualification || 'MBBS'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Reg. Number</span>
                    <span className="font-mono text-text-primary">
                      {doc.regNumber || 'Not specified'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-text-secondary">
                  {doc.user?.phoneNumber && (
                    <div className="flex items-center justify-between py-1 border-b border-surface-border">
                      <span className="flex items-center gap-1.5 text-text-muted">
                        <Phone className="w-3.5 h-3.5" />
                        Contact Mobile
                      </span>
                      <span className="font-medium text-text-primary">
                        {doc.user?.phoneNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between py-1 border-b border-surface-border">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <IndianRupee className="w-3.5 h-3.5" />
                      Consultation Fee
                    </span>
                    <span className="font-bold text-primary font-mono text-sm">
                      ₹{doc.consultationFee}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-surface-border">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Clock className="w-3.5 h-3.5" />
                      Working Hours
                    </span>
                    <span className="font-medium text-text-primary">
                      {doc.workingHours}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="flex items-center gap-1.5 text-text-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      Working Days
                    </span>
                    <span className="font-medium text-text-primary">
                      {doc.workingDays}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="pt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(doc)}
                    >
                      Edit Doctor
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-status-danger hover:bg-status-danger/10"
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                      onClick={() => setDeleteDoctor(doc)}
                    >
                      Deactivate
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Doctor Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Doctor to Roster"
        description="Register a doctor account, clinical specialization, fees, and schedule."
        maxWidth="lg"
      >
        <form onSubmit={handleAddDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Rahul"
              value={addForm.firstName}
              onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              placeholder="e.g. Sharma"
              value={addForm.lastName}
              onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Doctor Email Address"
              type="email"
              placeholder="dr.rahul@ewaderma.com"
              value={addForm.email}
              onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
              required
            />
            <Input
              label="Contact Phone"
              placeholder="+91 98765 43210"
              value={addForm.phone}
              onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Medical Specialization"
              placeholder="e.g. Dermatologist, Cosmetologist"
              value={addForm.specialization}
              onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })}
              required
            />
            <Input
              label="Qualification / Degrees"
              placeholder="e.g. MBBS, MD (Dermatology)"
              value={addForm.qualification}
              onChange={(e) => setAddForm({ ...addForm, qualification: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Medical Registration No."
              placeholder="e.g. UPMC-84920"
              value={addForm.regNumber}
              onChange={(e) => setAddForm({ ...addForm, regNumber: e.target.value })}
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              min={0}
              placeholder="500"
              value={addForm.consultationFee}
              onChange={(e) => setAddForm({ ...addForm, consultationFee: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Working Days"
              placeholder="e.g. Mon,Tue,Wed,Thu,Fri,Sat"
              value={addForm.workingDays}
              onChange={(e) => setAddForm({ ...addForm, workingDays: e.target.value })}
              required
            />
            <Input
              label="Working Hours"
              placeholder="e.g. 10:00-19:00"
              value={addForm.workingHours}
              onChange={(e) => setAddForm({ ...addForm, workingHours: e.target.value })}
              required
            />
          </div>

          <Input
            label="Initial Login Password"
            type="password"
            placeholder="Default: Doctor@123 (if left blank)"
            value={addForm.password}
            onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isAddSubmitting}>
              Create Doctor Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal
        isOpen={!!editDoctor}
        onClose={() => setEditDoctor(null)}
        title={`Edit Profile — Dr. ${editDoctor?.user?.firstName} ${editDoctor?.user?.lastName}`}
        description="Update doctor profile details, medical qualifications, fees, and schedule."
        maxWidth="lg"
      >
        <form onSubmit={handleUpdateDoctor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={editForm.firstName}
              onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name"
              value={editForm.lastName}
              onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            />
            <Input
              label="Contact Phone"
              value={editForm.phone}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Specialization"
              value={editForm.specialization}
              onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
              required
            />
            <Input
              label="Qualification"
              value={editForm.qualification}
              onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Medical Registration No."
              value={editForm.regNumber}
              onChange={(e) => setEditForm({ ...editForm, regNumber: e.target.value })}
            />
            <Input
              label="Consultation Fee (₹)"
              type="number"
              min={0}
              value={editForm.consultationFee}
              onChange={(e) => setEditForm({ ...editForm, consultationFee: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Working Days"
              value={editForm.workingDays}
              onChange={(e) => setEditForm({ ...editForm, workingDays: e.target.value })}
              placeholder="e.g. Mon,Tue,Wed,Thu,Fri,Sat,Sun"
              required
            />
            <Input
              label="Working Hours"
              value={editForm.workingHours}
              onChange={(e) => setEditForm({ ...editForm, workingHours: e.target.value })}
              placeholder="e.g. 10:00-19:00"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
              Roster Status
            </label>
            <select
              className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              value={editForm.isActive ? 'true' : 'false'}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.value === 'true' })}
            >
              <option value="true">Active / Available for Appointments</option>
              <option value="false">Inactive / On Leave</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setEditDoctor(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isEditSubmitting}>
              Save Doctor Profile
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete / Deactivate Doctor Modal */}
      <Modal
        isOpen={!!deleteDoctor}
        onClose={() => setDeleteDoctor(null)}
        title="Confirm Doctor Deactivation"
        description="Are you sure you want to deactivate this doctor from the active clinic roster?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating Dr. {deleteDoctor?.user?.firstName} {deleteDoctor?.user?.lastName} ({deleteDoctor?.specialization})
              </p>
              <p>
                This will prevent new appointment bookings for this doctor while maintaining past consultation notes and prescription records intact.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDoctor(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeleteDoctor}
            >
              Confirm Deactivation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

