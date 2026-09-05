'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  Stethoscope,
  Clock,
  Calendar,
  IndianRupee,
  Award,
  Edit2,
  CheckCircle2,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';

export default function DoctorsPage() {
  const { hasRole } = useAuth();
  const { showToast } = useToast();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [editDoctor, setEditDoctor] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    specialization: '',
    qualification: '',
    regNumber: '',
    consultationFee: 500,
    workingDays: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    workingHours: '10:00-19:00',
  });

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/doctors');
      const rawDoctors = res?.data?.data ?? res?.data;
      setDoctors(Array.isArray(rawDoctors) ? rawDoctors : []);
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

  const openEditModal = (doc: any) => {
    setEditDoctor(doc);
    setEditForm({
      specialization: doc.specialization || '',
      qualification: doc.qualification || '',
      regNumber: doc.regNumber || '',
      consultationFee: Number(doc.consultationFee) || 500,
      workingDays: doc.workingDays || 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
      workingHours: doc.workingHours || '10:00-19:00',
    });
  };

  const handleUpdateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoctor) return;

    setIsSubmitting(true);
    try {
      await api.patch(`/doctors/${editDoctor.id}`, editForm);
      showToast('Doctor profile updated successfully', 'success');
      setEditDoctor(null);
      fetchDoctors();
    } catch (err: any) {
      showToast(err.response?.data?.error?.message || 'Update failed', 'error');
    } finally {
      setIsSubmitting(false);
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
            Clinical doctor profiles, consultation pricing, and weekly schedule availability.
          </p>
        </div>

        <Badge variant="primary" size="md">
          {doctorList.length} Active Doctors
        </Badge>
      </div>

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-2 text-text-secondary">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Loading doctors roster...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctorList.map((doc) => (
            <Card key={doc.id} accentTop>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary border border-primary-100 flex items-center justify-center font-bold text-lg">
                    {doc.user?.firstName?.[0]}
                    {doc.user?.lastName?.[0]}
                  </div>
                  <div>
                    <CardTitle>
                      Dr. {doc.user?.firstName} {doc.user?.lastName}
                    </CardTitle>
                    <span className="text-xs text-accent font-semibold">
                      {doc.specialization}
                    </span>
                  </div>
                </div>

                <Badge variant={doc.isActive ? 'success' : 'default'} size="sm" dot>
                  {doc.isActive ? 'Available' : 'Inactive'}
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
                      {doc.workingHours} (Open 7 Days)
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
                  <div className="pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      onClick={() => openEditModal(doc)}
                    >
                      Edit Doctor Schedule & Fee
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Doctor Schedule Modal */}
      <Modal
        isOpen={!!editDoctor}
        onClose={() => setEditDoctor(null)}
        title={`Edit Schedule — Dr. ${editDoctor?.user?.firstName} ${editDoctor?.user?.lastName}`}
        description="Configure medical specialization, working hours, and consultation pricing."
      >
        <form onSubmit={handleUpdateDoctor} className="space-y-4">
          <Input
            label="Specialization"
            value={editForm.specialization}
            onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Qualification"
              value={editForm.qualification}
              onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
            />
            <Input
              label="Reg. Number"
              value={editForm.regNumber}
              onChange={(e) => setEditForm({ ...editForm, regNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Consultation Fee (₹)"
              type="number"
              min={0}
              value={editForm.consultationFee}
              onChange={(e) => setEditForm({ ...editForm, consultationFee: Number(e.target.value) })}
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

          <Input
            label="Working Days"
            value={editForm.workingDays}
            onChange={(e) => setEditForm({ ...editForm, workingDays: e.target.value })}
            placeholder="e.g. Mon,Tue,Wed,Thu,Fri,Sat,Sun"
            required
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button type="button" variant="outline" onClick={() => setEditDoctor(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
