import { useState } from 'react';
import axios from 'axios';

export default function ScanReceiptModal({ open, onClose, groupId, groupCurrency = 'INR', onExpenseCreated }) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:7777';
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ merchantName: '', amount: '', date: '', category: '' });

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setError('');
    if (f) setPreview(URL.createObjectURL(f));
  };

  const scan = async () => {
    try {
      setLoading(true);
      setError('');
      const fd = new FormData();
      if (!file) { setError('Please select an image'); setLoading(false); return; }
      fd.append('image', file);
      const { data } = await axios.post(`${API_BASE}/groups/${groupId}/analyze-receipt`, fd, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const d = data?.data || {};
      setForm({
        merchantName: d.merchantName || '',
        amount: d.amount ?? '',
        date: d.date || '',
        category: d.category || '',
      });
    } catch (e) {
      setError(e?.response?.data?.message || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const createExpense = async () => {
    try {
      setLoading(true);
      setError('');
      const payload = {
        amount: Number(form.amount || 0),
        currency: groupCurrency || 'INR',
        splitMethod: 'equal',
        // Attach OCR payload in bill for traceability
        bill: {
          source: 'ocr',
          rawText: JSON.stringify(form),
        },
      };
      const { data } = await axios.post(`${API_BASE}/groups/${groupId}/expenses`, payload, { withCredentials: true });
      onExpenseCreated?.(data?.expense);
      onClose();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <dialog className="modal" open>
      <div className="modal-box bg-white text-black">
        <h3 className="font-bold text-lg">Scan Receipt</h3>

        <div className="mt-3 space-y-3">
          <input type="file" accept="image/*" className="file-input file-input-bordered bg-white text-black border-slate-300 w-full" onChange={onFileChange} />
          {preview && (
            <div className="mt-2">
              <img src={preview} alt="preview" className="max-h-48 rounded border" />
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="flex gap-2">
            <button className="btn" onClick={onClose}>Close</button>
            <button className="btn btn-primary bg-emerald-500 border-none text-white" onClick={scan} disabled={loading}>
              {loading ? 'Scanning…' : 'Scan'}
            </button>
          </div>

          <div className="divider">Verify Details</div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label"><span className="label-text">Merchant</span></label>
              <input className="input input-bordered bg-white text-black border-slate-300" value={form.merchantName} onChange={e => setForm({ ...form, merchantName: e.target.value })} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Amount</span></label>
              <input type="number" className="input input-bordered bg-white text-black border-slate-300" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Date</span></label>
              <input type="date" className="input input-bordered bg-white text-black border-slate-300" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Category</span></label>
              <input className="input input-bordered bg-white text-black border-slate-300" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-3">
            <button className="btn btn-primary bg-emerald-500 border-none text-white" onClick={createExpense} disabled={loading || !form.amount}>
              {loading ? 'Saving…' : 'Create Expense'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
