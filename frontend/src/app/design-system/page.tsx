'use client';

import React, { useState } from 'react';
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
import { Tabs } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { Logo } from '@/components/ui/Logo';
import { THEME_COLORS, STATUS_MAPPINGS } from '@/styles/theme';
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Lock,
  Search,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar,
  CreditCard,
  Package,
} from 'lucide-react';

export default function DesignSystemPage() {
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('buttons');

  const demoTabs = [
    { id: 'buttons', label: 'Buttons & Actions', count: 6 },
    { id: 'inputs', label: 'Form Inputs', count: 4 },
    { id: 'badges', label: 'Badges & Statuses', count: 12 },
    { id: 'tables', label: 'Tables & Cards', count: 2 },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-accent" />
            <h1 className="text-2xl font-bold font-serif text-primary">
              Design System & Component Library
            </h1>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Standard visual tokens, UI primitives, and interaction states for Ewa Derma Clinic.
          </p>
        </div>
        <Badge variant="accent" size="md">
          Phase 1 Foundation
        </Badge>
      </div>

      {/* 1. Color Palette Tokens */}
      <Card>
        <CardHeader>
          <CardTitle>1. Color Palette & Theme Tokens</CardTitle>
          <span className="text-xs text-text-muted">Blue • White • Gold Design System</span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {/* Primary Blue */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border flex items-end p-2 text-white font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.primary.DEFAULT }}
              >
                #1E4E8C
              </div>
              <div className="text-xs font-semibold text-text-primary">Primary Blue</div>
              <div className="text-[11px] text-text-muted">Headers, Buttons, Links</div>
            </div>

            {/* Primary Light */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border flex items-end p-2 text-white font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.primary.light }}
              >
                #5B87BE
              </div>
              <div className="text-xs font-semibold text-text-primary">Primary Light</div>
              <div className="text-[11px] text-text-muted">Hover states, accents</div>
            </div>

            {/* Gold Accent */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border flex items-end p-2 text-white font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.accent.DEFAULT }}
              >
                #C9A24B
              </div>
              <div className="text-xs font-semibold text-text-primary">Gold Accent</div>
              <div className="text-[11px] text-text-muted">Badges, Highlights only</div>
            </div>

            {/* Surface Background */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border border-gray-300 flex items-end p-2 text-text-primary font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.surface.DEFAULT }}
              >
                #F7F8FA
              </div>
              <div className="text-xs font-semibold text-text-primary">Surface Background</div>
              <div className="text-[11px] text-text-muted">App body, cards</div>
            </div>

            {/* Success */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border flex items-end p-2 text-white font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.status.success.text }}
              >
                #15803D
              </div>
              <div className="text-xs font-semibold text-text-primary">Success Green</div>
              <div className="text-[11px] text-text-muted">Paid, Completed, Active</div>
            </div>

            {/* Danger */}
            <div className="space-y-1.5">
              <div
                className="h-20 rounded-xl shadow-xs border flex items-end p-2 text-white font-mono text-xs font-bold"
                style={{ backgroundColor: THEME_COLORS.status.danger.text }}
              >
                #B91C1C
              </div>
              <div className="text-xs font-semibold text-text-primary">Danger Red</div>
              <div className="text-[11px] text-text-muted">Cancelled, Expired, Void</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Interactive Component Showcase with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>2. Shared Component Library</CardTitle>
          <span className="text-xs text-text-muted">Click tabs to test components</span>
        </CardHeader>
        <div className="px-6 pt-2">
          <Tabs tabs={demoTabs} activeTab={activeTab} onChange={setActiveTab} />
        </div>
        <CardContent className="pt-6">
          {/* TAB 1: BUTTONS & ACTIONS */}
          {activeTab === 'buttons' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  Button Variants
                </h4>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="accent">Gold Accent</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="danger">Danger Action</Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  Button Sizes & States
                </h4>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="primary" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                    Small (32px)
                  </Button>
                  <Button size="md" variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}>
                    Medium (40px)
                  </Button>
                  <Button size="lg" variant="primary">
                    Large (48px)
                  </Button>
                  <Button isLoading variant="primary">
                    Loading
                  </Button>
                  <Button disabled variant="primary">
                    Disabled
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  Toast Triggers
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showToast('Patient P-1001 registered successfully', 'success', 'Saved')}
                  >
                    Trigger Success Toast
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showToast('Stock for Clobetasol is below minimum threshold', 'warning', 'Low Stock')}
                  >
                    Trigger Warning Toast
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => showToast('Invalid credentials provided', 'error', 'Error')}
                  >
                    Trigger Error Toast
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Open Modal Window
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INPUTS */}
          {activeTab === 'inputs' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-150">
              <Input
                label="Standard Text Input"
                placeholder="Enter patient full name"
                defaultValue="Rohan Verma"
              />
              <Input
                label="With Search Icon"
                placeholder="Search patient by phone / ID..."
                leftIcon={<Search className="w-4 h-4" />}
              />
              <Input
                label="Email Input (Required)"
                placeholder="doctor@ewaderma.com"
                type="email"
                required
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Input With Error State"
                defaultValue="invalid-email"
                error="Please enter a valid clinical email address"
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </div>
          )}

          {/* TAB 3: BADGES & STATUSES */}
          {activeTab === 'badges' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  Base Badges
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="primary">Primary Badge</Badge>
                  <Badge variant="accent">Gold Accent</Badge>
                  <Badge variant="success" dot>Active</Badge>
                  <Badge variant="warning" dot>Pending</Badge>
                  <Badge variant="danger" dot>Cancelled</Badge>
                  <Badge variant="info" dot>Scheduled</Badge>
                  <Badge variant="default">Default</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase text-text-muted tracking-wider">
                  System-Wide Unified Statuses
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(STATUS_MAPPINGS).map(([key, value]) => (
                    <div
                      key={key}
                      className="p-3 rounded-lg border border-surface-border bg-surface flex items-center justify-between"
                    >
                      <span className="text-xs font-medium text-text-secondary font-mono">{key}</span>
                      <Badge variant={value.variant} size="sm" dot>
                        {value.label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TABLES & CARDS */}
          {activeTab === 'tables' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity Code</TableHead>
                    <TableHead>Patient Name</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono font-bold text-primary">A-2001</TableCell>
                    <TableCell className="font-medium">Ananya Sharma</TableCell>
                    <TableCell>Dr. A Sharma</TableCell>
                    <TableCell>Consultation</TableCell>
                    <TableCell>
                      <Badge variant="warning" size="sm" dot>
                        Checked In
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">View</Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono font-bold text-primary">A-2002</TableCell>
                    <TableCell className="font-medium">Vikram Mehra</TableCell>
                    <TableCell>Dr. B Singh</TableCell>
                    <TableCell>Laser Procedure</TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm" dot>
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">View</Button>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono font-bold text-primary">INV-5001</TableCell>
                    <TableCell className="font-medium">Pooja Patel</TableCell>
                    <TableCell>Dr. A Sharma</TableCell>
                    <TableCell>PRP Therapy</TableCell>
                    <TableCell>
                      <Badge variant="success" size="sm" dot>
                        Paid (₹5,000)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">Receipt</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Design System Demo Modal"
        description="Standard dialog component for confirmations and quick forms"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            This modal follows the Ewa Derma clean clinical aesthetic with smooth backdrop blur, Escape key dismissal, and standard button footers.
          </p>
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-border">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setIsModalOpen(false);
                showToast('Action confirmed from modal', 'success');
              }}
            >
              Confirm Action
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
