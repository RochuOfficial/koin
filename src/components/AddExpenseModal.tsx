import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { store, EXPENSE_CATEGORIES, Expense } from '@/lib/store';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AddExpenseModal({ open, onClose }: Props) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  const handleSave = () => {
    if (!amount || !category) return;
    const expense: Expense = {
      id: crypto.randomUUID(),
      amount: Number(amount),
      category,
      date: new Date().toISOString().split('T')[0],
      note: note || undefined,
    };
    store.addExpense(expense);
    setAmount('');
    setCategory('');
    setNote('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="mx-auto max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-label-medium text-on-surface-variant">Amount ($)</label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="text-xl font-bold" autoFocus />
          </div>
          <div>
            <label className="mb-1.5 block text-label-medium text-on-surface-variant">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {EXPENSE_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-label-small transition-all ${
                    category === c.id
                      ? 'bg-primary-container text-on-primary-container ring-2 ring-primary'
                      : 'bg-surface-container-low text-on-surface-variant'
                  }`}
                >
                  <span className="text-lg">{c.icon}</span>
                  <span className="truncate w-full text-center">{c.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" />
          <Button onClick={handleSave} disabled={!amount || !category} className="w-full">
            Save Expense
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
