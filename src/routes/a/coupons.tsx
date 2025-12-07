import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import getSession from '@/server-fn/get-session'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { format } from 'date-fns'
import { CalendarIcon, Edit, Loader2, Plus, Ticket, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import useMobile from '@/hooks/useMobile'
import type { Coupon } from '@/db/schema'

export const Route = createFileRoute('/a/coupons')({
  component: CouponsAdmin,
  loader: async () => {
    const session = await getSession()
    const super_admin_email = process.env.SUPER_ADMIN
    if (!super_admin_email) throw new Error('SUPER_ADMIN env var not set')

    if (session.user.email != super_admin_email) {
      throw redirect({ to: '/drawings' })
    }
    return { session }
  },
})

interface CouponFormData {
  id?: number
  code: string
  giwayType: 'play_with_numbers' | 'no_numbers'
  participants: number
  images: number
  emails: number
  maxUses: number | null
  expiresAt: Date | null
  isActive: boolean
}

const defaultFormData: CouponFormData = {
  code: '',
  giwayType: 'play_with_numbers',
  participants: 100,
  images: 1,
  emails: 0,
  maxUses: null,
  expiresAt: null,
  isActive: true,
}

function CouponsAdmin() {
  const queryClient = useQueryClient()
  const isMobile = useMobile()
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)
  const [deletingCoupon, setDeletingCoupon] = useState<Coupon | null>(null)
  const [formData, setFormData] = useState<CouponFormData>(defaultFormData)

  // Fetch coupons
  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const res = await fetch('/api/a/coupons')
      if (!res.ok) throw new Error('Failed to fetch coupons')
      return res.json()
    },
  })

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      const method = data.id ? 'PUT' : 'POST'
      const res = await fetch('/api/a/coupons', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success(editingCoupon ? 'Coupon updated' : 'Coupon created')
      handleClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/a/coupons?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] })
      toast.success('Coupon deleted')
      setIsDeleteOpen(false)
      setDeletingCoupon(null)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleOpen = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon)
      setFormData({
        id: coupon.id,
        code: coupon.code,
        giwayType: coupon.giwayType,
        participants: coupon.participants,
        images: coupon.images,
        emails: coupon.emails,
        maxUses: coupon.maxUses,
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt) : null,
        isActive: coupon.isActive,
      })
    } else {
      setEditingCoupon(null)
      setFormData(defaultFormData)
    }
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setEditingCoupon(null)
    setFormData(defaultFormData)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(formData)
  }

  const handleDelete = (coupon: Coupon) => {
    setDeletingCoupon(coupon)
    setIsDeleteOpen(true)
  }

  const confirmDelete = () => {
    if (deletingCoupon) {
      deleteMutation.mutate(deletingCoupon.id)
    }
  }

  // Form content (shared between Dialog and Drawer)
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="code">Coupon Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) =>
              setFormData({ ...formData, code: e.target.value.toUpperCase() })
            }
            placeholder="SUMMER2025"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="giwayType">Giway Type</Label>
          <Select
            value={formData.giwayType}
            onValueChange={(value: 'play_with_numbers' | 'no_numbers') =>
              setFormData({ ...formData, giwayType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="play_with_numbers">
                Raffle (Play with Numbers)
              </SelectItem>
              <SelectItem value="no_numbers">Giveaway (No Numbers)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-2">
            <Label htmlFor="participants">Participants</Label>
            <Input
              id="participants"
              type="number"
              min={0}
              value={formData.participants}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  participants: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="images">Images</Label>
            <Input
              id="images"
              type="number"
              min={0}
              value={formData.images}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  images: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="emails">Emails</Label>
            <Input
              id="emails"
              type="number"
              min={0}
              value={formData.emails}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  emails: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="maxUses">Max Uses (empty = unlimited)</Label>
          <Input
            id="maxUses"
            type="number"
            min={1}
            value={formData.maxUses ?? ''}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxUses: e.target.value ? parseInt(e.target.value) : null,
              })
            }
            placeholder="Unlimited"
          />
        </div>

        <div className="grid gap-2">
          <Label>Expires At (optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.expiresAt
                  ? format(formData.expiresAt, 'PPP')
                  : 'Never expires'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.expiresAt ?? undefined}
                onSelect={(date) =>
                  setFormData({ ...formData, expiresAt: date ?? null })
                }
                initialFocus
              />
              {formData.expiresAt && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setFormData({ ...formData, expiresAt: null })
                    }
                  >
                    Clear date
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Active</Label>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isActive: checked })
            }
          />
        </div>
      </div>
    </form>
  )

  // Delete confirmation content
  const deleteContent = (
    <div className="space-y-4">
      <p>
        Are you sure you want to delete the coupon{' '}
        <strong>{deletingCoupon?.code}</strong>?
      </p>
      <p className="text-sm text-muted-foreground">
        This action cannot be undone. Users who have already redeemed this
        coupon will keep their balance.
      </p>
    </div>
  )

  return (
    <div className="min-h-[calc(100svh-129px)] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Coupons Management</h1>
            <p className="text-muted-foreground">
              Create and manage coupon codes
            </p>
          </div>
          <Button onClick={() => handleOpen()}>
            <Plus className="h-4 w-4 mr-2" />
            New Coupon
          </Button>
        </div>

        {isLoading ? (
          <Card className="p-6">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          </Card>
        ) : coupons && coupons.length > 0 ? (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <Card key={coupon.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${coupon.isActive ? 'bg-green-100 dark:bg-green-900' : 'bg-gray-100 dark:bg-gray-800'}`}
                    >
                      <Ticket
                        className={`h-5 w-5 ${coupon.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">
                          {coupon.code}
                        </span>
                        {!coupon.isActive && (
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {coupon.giwayType === 'play_with_numbers'
                          ? 'Raffle'
                          : 'Giveaway'}{' '}
                        • {coupon.participants} participants • {coupon.images}{' '}
                        images
                        {coupon.maxUses && (
                          <span>
                            {' '}
                            • {coupon.usedCount}/{coupon.maxUses} used
                          </span>
                        )}
                        {coupon.expiresAt && (
                          <span>
                            {' '}
                            • Expires{' '}
                            {format(new Date(coupon.expiresAt), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleOpen(coupon)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(coupon)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No coupons yet</p>
              <p className="text-sm">Create your first coupon to get started</p>
            </div>
          </Card>
        )}

        {/* Create/Edit Modal - Dialog for desktop, Drawer for mobile */}
        {isMobile ? (
          <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </DrawerTitle>
                <DrawerDescription>
                  {editingCoupon
                    ? 'Update the coupon details below'
                    : 'Fill in the details to create a new coupon'}
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4 overflow-y-auto">{formContent}</div>
              <DrawerFooter>
                <Button
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCoupon ? 'Update' : 'Create'}
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
                </DialogTitle>
                <DialogDescription>
                  {editingCoupon
                    ? 'Update the coupon details below'
                    : 'Fill in the details to create a new coupon'}
                </DialogDescription>
              </DialogHeader>
              {formContent}
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingCoupon ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation - Dialog for desktop, Drawer for mobile */}
        {isMobile ? (
          <Drawer open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete Coupon</DrawerTitle>
                <DrawerDescription>
                  This action cannot be undone.
                </DrawerDescription>
              </DrawerHeader>
              <div className="px-4">{deleteContent}</div>
              <DrawerFooter>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
                <DrawerClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DrawerClose>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        ) : (
          <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Coupon</DialogTitle>
                <DialogDescription>
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {deleteContent}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeleteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
