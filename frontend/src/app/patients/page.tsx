'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Modal } from '@/components/ui/Modal';
import { TableSkeleton } from '@/components/ui/Skeleton';
import {
  Users,
  Search,
  UserPlus,
  Phone,
  Calendar,
  Eye,
  CalendarPlus,
  Loader2,
  FileText,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useDebouncedValue } from '@/lib/useDebouncedValue';

export default function PatientsPage() {
  const { user, hasRole } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [patients, setPatients] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [isLoading, setIsLoading] = useState(true);
  
  // Register Modal State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editPatient, setEditPatient] = useState<any | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Delete Modal State
  const [deletePatient, setDeletePatient] = useState<any | null>(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // Register Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'NOT_SPECIFIED',
    bloodGroup: 'UNKNOWN',
    address: '',
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
  });

  // Edit Form State
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: 'NOT_SPECIFIED',
    bloodGroup: 'UNKNOWN',
    address: '',
    city: '',
    state: '',
    emergencyContact: '',
    medicalHistory: '',
    allergies: '',
  });

  const fetchPatients = useCallback(async (query: string = '') => {
    setIsLoading(true);
    try {
      const res = await api.get('/patients', {
        params: { search: query || undefined, limit: 50 },
      });

      const data = res.data.data;
      if (data && Array.isArray(data.items)) {
        setPatients(data.items);
        setTotalCount(data.total);
      } else if (Array.isArray(data)) {
        setPatients(data);
        setTotalCount(data.length);
      } else {
        setPatients([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      showToast('Failed to fetch patient directory', 'error');
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPatients(debouncedQuery);
  }, [fetchPatients, debouncedQuery]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.phone.trim()) {
      showToast('First name, last name, and phone number are required', 'warning', 'Missing Fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() ? formData.email.trim() : undefined,
        dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : undefined,
        address: formData.address.trim() ? formData.address.trim() : undefined,
        city: formData.city.trim() ? formData.city.trim() : undefined,
        state: formData.state.trim() ? formData.state.trim() : undefined,
        emergencyContact: formData.emergencyContact.trim() ? formData.emergencyContact.trim() : undefined,
        medicalHistory: formData.medicalHistory.trim() ? formData.medicalHistory.trim() : undefined,
        allergies: formData.allergies.trim() ? formData.allergies.trim() : undefined,
      };

      const res = await api.post('/patients', payload);
      const newPatient = res.data.data;
      showToast(
        `Patient ${newPatient.patientCode} (${newPatient.firstName} ${newPatient.lastName}) registered successfully. WhatsApp confirmation triggered.`,
        'success',
        'Patient Registered',
      );
      setIsRegisterOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        dateOfBirth: '',
        gender: 'NOT_SPECIFIED',
        bloodGroup: 'UNKNOWN',
        address: '',
        city: 'Lucknow',
        state: 'Uttar Pradesh',
        emergencyContact: '',
        medicalHistory: '',
        allergies: '',
      });
      fetchPatients(searchQuery);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Registration Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (pt: any) => {
    setEditPatient(pt);
    setEditFormData({
      firstName: pt.firstName || '',
      lastName: pt.lastName || '',
      phone: pt.phone || '',
      email: pt.email || '',
      dateOfBirth: pt.dateOfBirth ? pt.dateOfBirth.split('T')[0] : '',
      gender: pt.gender || 'NOT_SPECIFIED',
      bloodGroup: pt.bloodGroup || 'UNKNOWN',
      address: pt.address || '',
      city: pt.city || '',
      state: pt.state || '',
      emergencyContact: pt.emergencyContact || '',
      medicalHistory: pt.medicalHistory || '',
      allergies: pt.allergies || '',
    });
  };

  const handleUpdatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPatient) return;

    if (!editFormData.firstName.trim() || !editFormData.lastName.trim() || !editFormData.phone.trim()) {
      showToast('First name, last name, and phone number are required', 'warning', 'Missing Fields');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const payload = {
        firstName: editFormData.firstName.trim(),
        lastName: editFormData.lastName.trim(),
        phone: editFormData.phone.trim(),
        email: editFormData.email.trim() ? editFormData.email.trim() : null,
        dateOfBirth: editFormData.dateOfBirth ? editFormData.dateOfBirth : null,
        gender: editFormData.gender,
        bloodGroup: editFormData.bloodGroup,
        address: editFormData.address.trim() ? editFormData.address.trim() : null,
        city: editFormData.city.trim() ? editFormData.city.trim() : null,
        state: editFormData.state.trim() ? editFormData.state.trim() : null,
        emergencyContact: editFormData.emergencyContact.trim() ? editFormData.emergencyContact.trim() : null,
        medicalHistory: editFormData.medicalHistory.trim() ? editFormData.medicalHistory.trim() : null,
        allergies: editFormData.allergies.trim() ? editFormData.allergies.trim() : null,
      };

      await api.patch(`/patients/${editPatient.id}`, payload);
      showToast(`Patient ${editPatient.patientCode} updated successfully.`, 'success', 'Profile Updated');
      setEditPatient(null);
      fetchPatients(searchQuery);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Update Failed');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleDeletePatient = async () => {
    if (!deletePatient) return;
    setIsDeleteSubmitting(true);
    try {
      await api.delete(`/patients/${deletePatient.id}`);
      showToast(`Patient ${deletePatient.patientCode} (${deletePatient.firstName} ${deletePatient.lastName}) has been removed.`, 'success', 'Patient Deleted');
      setDeletePatient(null);
      fetchPatients(searchQuery);
    } catch (err: any) {
      const msg = getErrorMessage(err);
      showToast(msg, 'error', 'Delete Failed');
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  const isReceptionOrAdmin = hasRole(['ADMIN', 'RECEPTIONIST']);
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-surface-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold font-serif text-text-primary">
              Patient Management
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Search, register, edit, and manage patient profiles and visit histories.
          </p>
        </div>

        {isReceptionOrAdmin && (
          <Button
            variant="primary"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => setIsRegisterOpen(true)}
          >
            Register New Patient
          </Button>
        )}
      </div>

      {/* Search & Statistics Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:max-w-md">
            <Input
              placeholder="Search by patient name, mobile, or ID (e.g. P-1001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-text-muted" />}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>Total Registered Patients:</span>
            <Badge variant="primary" size="sm" className="font-bold font-mono">
              {totalCount}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Directory</CardTitle>
          <span className="text-xs text-text-muted">
            {isLoading ? 'Searching...' : `Showing ${patients.length} records`}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={6} />
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-10 h-10 text-text-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-text-primary">No patients found</p>
                <p className="text-xs text-text-secondary">
                  {searchQuery ? `No results matching "${searchQuery}"` : 'Get started by registering a new patient.'}
                </p>
              </div>
              {isReceptionOrAdmin && (
                <Button size="sm" variant="outline" onClick={() => setIsRegisterOpen(true)}>
                  Register Patient
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Mobile Number</TableHead>
                  <TableHead>Gender / Blood</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((pt) => (
                  <TableRow key={pt.id}>
                    <TableCell className="font-mono font-bold text-primary">
                      <Link
                        href={`/patients/${pt.id}`}
                        className="hover:underline flex items-center gap-1"
                      >
                        {pt.patientCode}
                      </Link>
                    </TableCell>

                    <TableCell>
                      <Link
                        href={`/patients/${pt.id}`}
                        className="font-medium hover:text-primary transition-colors block"
                      >
                        {pt.firstName} {pt.lastName}
                      </Link>
                      {pt.email && (
                        <span className="text-xs text-text-muted block">{pt.email}</span>
                      )}
                    </TableCell>

                    <TableCell className="text-xs font-medium text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-text-muted" />
                        {pt.phone}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="default" size="sm">
                          {pt.gender ? pt.gender.replace('_', ' ') : 'N/A'}
                        </Badge>
                        {pt.bloodGroup && pt.bloodGroup !== 'UNKNOWN' && (
                          <Badge variant="danger" size="sm">
                            {pt.bloodGroup.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-xs text-text-secondary">
                      {new Date(pt.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/patients/${pt.id}`}>
                          <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                            View
                          </Button>
                        </Link>
                        {isReceptionOrAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Edit2 className="w-3.5 h-3.5 text-blue-600" />}
                            onClick={() => openEditModal(pt)}
                          >
                            Edit
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-status-danger hover:bg-status-danger/10"
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-status-danger" />}
                            onClick={() => setDeletePatient(pt)}
                          >
                            Delete
                          </Button>
                        )}
                        {isReceptionOrAdmin && (
                          <Link href={`/appointments?patientId=${pt.id}`}>
                            <Button size="sm" variant="ghost" leftIcon={<CalendarPlus className="w-3.5 h-3.5 text-primary" />}>
                              Book
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Register Patient Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Patient"
        description="Fill in patient personal, contact, and basic medical details."
        maxWidth="lg"
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="e.g. Aarav"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              placeholder="e.g. Gupta"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              required
              placeholder="10-digit mobile (e.g. 9876543210)"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="patient@example.com (Optional)"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Gender
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="NOT_SPECIFIED">Not Specified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Blood Group
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="O_POSITIVE">O+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Address"
              placeholder="Apartment, Street, Sector"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
            <Input
              label="Emergency Contact"
              placeholder="Name & Phone (e.g. Spouse: 9876543211)"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Known Allergies"
              placeholder="e.g. Sulfa drugs, Salicylic acid"
              value={formData.allergies}
              onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
            />
            <Input
              label="Medical History / Notes"
              placeholder="e.g. Hypertension, Acne breakouts"
              value={formData.medicalHistory}
              onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRegisterOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Save & Register Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Patient Modal */}
      <Modal
        isOpen={!!editPatient}
        onClose={() => setEditPatient(null)}
        title={`Edit Patient Details — ${editPatient?.patientCode}`}
        description="Update personal demographic info, contact numbers, and medical profile."
        maxWidth="lg"
      >
        <form onSubmit={handleUpdatePatient} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              required
              placeholder="e.g. Aarav"
              value={editFormData.firstName}
              onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              required
              placeholder="e.g. Gupta"
              value={editFormData.lastName}
              onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Mobile Number"
              required
              placeholder="10-digit mobile"
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="patient@example.com (Optional)"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              value={editFormData.dateOfBirth}
              onChange={(e) => setEditFormData({ ...editFormData, dateOfBirth: e.target.value })}
            />

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Gender
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editFormData.gender}
                onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="NOT_SPECIFIED">Not Specified</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary tracking-wide mb-1.5">
                Blood Group
              </label>
              <select
                className="block w-full rounded-lg border border-gray-300 py-2.5 px-3 text-sm bg-white text-text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                value={editFormData.bloodGroup}
                onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
              >
                <option value="UNKNOWN">Unknown</option>
                <option value="A_POSITIVE">A+</option>
                <option value="A_NEGATIVE">A-</option>
                <option value="B_POSITIVE">B+</option>
                <option value="B_NEGATIVE">B-</option>
                <option value="AB_POSITIVE">AB+</option>
                <option value="AB_NEGATIVE">AB-</option>
                <option value="O_POSITIVE">O+</option>
                <option value="O_NEGATIVE">O-</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Address"
              placeholder="Apartment, Street, Sector"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
            />
            <Input
              label="Emergency Contact"
              placeholder="Name & Phone (e.g. Spouse: 9876543211)"
              value={editFormData.emergencyContact}
              onChange={(e) => setEditFormData({ ...editFormData, emergencyContact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Known Allergies"
              placeholder="e.g. Sulfa drugs, Salicylic acid"
              value={editFormData.allergies}
              onChange={(e) => setEditFormData({ ...editFormData, allergies: e.target.value })}
            />
            <Input
              label="Medical History / Notes"
              placeholder="e.g. Hypertension, Acne breakouts"
              value={editFormData.medicalHistory}
              onChange={(e) => setEditFormData({ ...editFormData, medicalHistory: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditPatient(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isEditSubmitting}
            >
              Update Patient
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Patient Confirmation Modal */}
      <Modal
        isOpen={!!deletePatient}
        onClose={() => setDeletePatient(null)}
        title="Confirm Patient Deletion"
        description="Are you sure you want to deactivate and remove this patient record?"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-danger shrink-0 mt-0.5" />
            <div className="text-xs text-red-800 space-y-1">
              <p className="font-semibold">
                Deactivating {deletePatient?.firstName} {deletePatient?.lastName} ({deletePatient?.patientCode})
              </p>
              <p>
                This will soft-delete the patient from active directory lists while preserving past financial invoices and prescription audit history.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletePatient(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              isLoading={isDeleteSubmitting}
              onClick={handleDeletePatient}
            >
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

