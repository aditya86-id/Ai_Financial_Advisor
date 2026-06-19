'use client'

import { createClient } from '@/lib/supabase/client'
import {
  ArrowDownRight,
  Bot,
  CalendarDays,
  CreditCard,
  IndianRupee,
  Loader2,
  LogOut,
  PiggyBank,
  Plus,
  Send,
  Target,
  Trash2,
  WalletCards,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

type Expense = {
  id: string
  date: string
  description: string
  amount: number | string
  category: string
}

type Goal = {
  id: string
  name: string
  target_amount: number | string
  current_amount: number | string
  target_date: string | null
}

type Budget = {
  id: string
  category: string
  limit_amount: number | string
  current_spent: number | string
  period: string
}

type Message = {
  sender: 'user' | 'assistant'
  content: string
}

const money = new Intl.NumberFormat('en-IN', {
  currency: 'INR',
  maximumFractionDigits: 0,
  style: 'currency',
})

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value)
}

async function api<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const payload = (await response.json()) as T & { error?: string }

  if (!response.ok) {
    throw new Error(payload.error ?? 'Request failed')
  }

  return payload
}

export default function DashboardClient() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isThinking, setIsThinking] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'Food',
    description: '',
  })
  const [goalForm, setGoalForm] = useState({
    currentAmount: '',
    name: '',
    targetAmount: '',
  })
  const [budgetForm, setBudgetForm] = useState({
    category: '',
    limitAmount: '',
  })
  const [coachPrompt, setCoachPrompt] = useState('')

  const totalExpenses = useMemo(
    () => expenses.reduce((sum, item) => sum + toNumber(item.amount), 0),
    [expenses]
  )
  const totalGoalBalance = useMemo(
    () => goals.reduce((sum, item) => sum + toNumber(item.current_amount), 0),
    [goals]
  )

  useEffect(() => {
    void loadApp()
  }, [])

  async function loadApp() {
    setIsLoading(true)
    setNotice('')

    try {
      const [expensesPayload, goalsPayload, budgetsPayload, conversationPayload] =
        await Promise.all([
          api<{ expenses: Expense[] }>('/api/expenses?limit=20'),
          api<{ goals: Goal[] }>('/api/goals'),
          api<{ budgets: Budget[] }>('/api/budgets'),
          api<{ conversation: { id: string } }>('/api/conversations', {
            body: JSON.stringify({ title: 'Finance coach' }),
            method: 'POST',
          }),
        ])

      setExpenses(expensesPayload.expenses)
      setGoals(goalsPayload.goals)
      setBudgets(budgetsPayload.budgets)
      setConversationId(conversationPayload.conversation.id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Unable to load dashboard')
    } finally {
      setIsLoading(false)
    }
  }

  async function addExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!expenseForm.amount) return

    const payload = await api<{ expense: Expense }>('/api/expenses', {
      body: JSON.stringify({
        amount: Number(expenseForm.amount),
        category: expenseForm.category,
        description: expenseForm.description || expenseForm.category,
      }),
      method: 'POST',
    })

    setExpenses((items) => [payload.expense, ...items])
    setExpenseForm({ amount: '', category: 'Food', description: '' })
  }

  async function addGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!goalForm.name || !goalForm.targetAmount) return

    const payload = await api<{ goal: Goal }>('/api/goals', {
      body: JSON.stringify({
        currentAmount: Number(goalForm.currentAmount || 0),
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
      }),
      method: 'POST',
    })

    setGoals((items) => [payload.goal, ...items])
    setGoalForm({ currentAmount: '', name: '', targetAmount: '' })
  }

  async function addBudget(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!budgetForm.category || !budgetForm.limitAmount) return

    const payload = await api<{ budget: Budget }>('/api/budgets', {
      body: JSON.stringify({
        category: budgetForm.category,
        limitAmount: Number(budgetForm.limitAmount),
      }),
      method: 'POST',
    })

    setBudgets((items) => [payload.budget, ...items])
    setBudgetForm({ category: '', limitAmount: '' })
  }

  async function removeItem(kind: 'expenses' | 'goals' | 'budgets', id: string) {
    await api<{ success: boolean }>(`/api/${kind}/${id}`, { method: 'DELETE' })

    if (kind === 'expenses') setExpenses((items) => items.filter((item) => item.id !== id))
    if (kind === 'goals') setGoals((items) => items.filter((item) => item.id !== id))
    if (kind === 'budgets') setBudgets((items) => items.filter((item) => item.id !== id))
  }

  async function askCoach(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!conversationId || !coachPrompt.trim()) return

    const prompt = coachPrompt
    setCoachPrompt('')
    setIsThinking(true)
    setMessages((items) => [...items, { sender: 'user', content: prompt }, { sender: 'assistant', content: '' }])

    try {
      const response = await fetch('/api/coach/chat', {
        body: JSON.stringify({ conversationId, message: prompt }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      if (!response.ok || !response.body) {
        const payload = await response.json()
        throw new Error(payload.error ?? 'Coach request failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const eventText of events) {
          const line = eventText.trim()
          if (!line.startsWith('data:')) continue
          const payload = line.slice(5).trim()
          if (payload === '[DONE]') continue

          const { text } = JSON.parse(payload) as { text: string }
          setMessages((items) => {
            const next = [...items]
            const last = next[next.length - 1]
            next[next.length - 1] = { ...last, content: last.content + text }
            return next
          })
        }
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Coach is unavailable')
    } finally {
      setIsThinking(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-[#15171c]">
      <header className="border-b border-[#e2e6ef] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#115e59] text-white">
              <IndianRupee size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">FinCoach AI</h1>
              <p className="text-xs text-[#6b7280]">Free plan with Groq coach</p>
            </div>
          </div>
          <button
            className="flex h-9 items-center gap-2 rounded-md border border-[#d7dce8] px-3 text-sm font-medium text-[#4b5563]"
            onClick={signOut}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-6 sm:px-6 xl:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          {notice && (
            <div className="rounded-lg border border-[#fed7aa] bg-[#fff7ed] px-4 py-3 text-sm text-[#9a3412]">
              {notice}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <Metric icon={ArrowDownRight} label="Recent expenses" value={money.format(totalExpenses)} />
            <Metric icon={PiggyBank} label="Saved toward goals" value={money.format(totalGoalBalance)} />
            <Metric icon={WalletCards} label="Budgets tracked" value={String(budgets.length)} />
          </div>

          <Panel title="Add Expense" icon={CreditCard}>
            <form className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={addExpense}>
              <Input
                label="Amount"
                onChange={(value) => setExpenseForm((form) => ({ ...form, amount: value }))}
                type="number"
                value={expenseForm.amount}
              />
              <Input
                label="Category"
                onChange={(value) => setExpenseForm((form) => ({ ...form, category: value }))}
                value={expenseForm.category}
              />
              <Input
                label="Description"
                onChange={(value) => setExpenseForm((form) => ({ ...form, description: value }))}
                value={expenseForm.description}
              />
              <SubmitButton />
            </form>
          </Panel>

          <Panel title="Expenses" icon={CalendarDays}>
            <ItemList
              empty="No expenses yet."
              items={expenses.map((item) => ({
                id: item.id,
                meta: item.category,
                title: item.description,
                value: money.format(toNumber(item.amount)),
              }))}
              onDelete={(id) => removeItem('expenses', id)}
            />
          </Panel>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Goals" icon={Target}>
              <form className="mb-4 grid gap-3" onSubmit={addGoal}>
                <Input
                  label="Goal name"
                  onChange={(value) => setGoalForm((form) => ({ ...form, name: value }))}
                  value={goalForm.name}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Target"
                    onChange={(value) => setGoalForm((form) => ({ ...form, targetAmount: value }))}
                    type="number"
                    value={goalForm.targetAmount}
                  />
                  <Input
                    label="Saved"
                    onChange={(value) => setGoalForm((form) => ({ ...form, currentAmount: value }))}
                    type="number"
                    value={goalForm.currentAmount}
                  />
                </div>
                <SubmitButton label="Add goal" />
              </form>
              <ItemList
                empty="No goals yet."
                items={goals.map((item) => ({
                  id: item.id,
                  meta: `${money.format(toNumber(item.current_amount))} saved`,
                  title: item.name,
                  value: money.format(toNumber(item.target_amount)),
                }))}
                onDelete={(id) => removeItem('goals', id)}
              />
            </Panel>

            <Panel title="Budgets" icon={PiggyBank}>
              <form className="mb-4 grid gap-3" onSubmit={addBudget}>
                <Input
                  label="Category"
                  onChange={(value) => setBudgetForm((form) => ({ ...form, category: value }))}
                  value={budgetForm.category}
                />
                <Input
                  label="Limit"
                  onChange={(value) => setBudgetForm((form) => ({ ...form, limitAmount: value }))}
                  type="number"
                  value={budgetForm.limitAmount}
                />
                <SubmitButton label="Add budget" />
              </form>
              <ItemList
                empty="No budgets yet."
                items={budgets.map((item) => ({
                  id: item.id,
                  meta: item.period,
                  title: item.category,
                  value: money.format(toNumber(item.limit_amount)),
                }))}
                onDelete={(id) => removeItem('budgets', id)}
              />
            </Panel>
          </div>
        </section>

        <aside className="space-y-5">
          <Panel title="AI Coach" icon={Bot}>
            <div className="mb-4 max-h-[420px] space-y-3 overflow-auto rounded-md bg-[#f7f8fb] p-3">
              {messages.length === 0 && (
                <p className="text-sm text-[#6b7280]">
                  Ask about saving, budgets, debt, or spending habits.
                </p>
              )}
              {messages.map((message, index) => (
                <div
                  className={`rounded-md px-3 py-2 text-sm leading-6 ${
                    message.sender === 'user'
                      ? 'ml-8 bg-[#dbeafe] text-[#1e3a8a]'
                      : 'mr-8 bg-white text-[#374151]'
                  }`}
                  key={`${message.sender}-${index}`}
                >
                  {message.content || 'Thinking...'}
                </div>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={askCoach}>
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#115e59]"
                onChange={(event) => setCoachPrompt(event.target.value)}
                placeholder="Ask your finance coach..."
                value={coachPrompt}
              />
              <button
                className="flex h-11 w-11 items-center justify-center rounded-md bg-[#115e59] text-white disabled:opacity-60"
                disabled={isThinking}
              >
                {isThinking ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
              </button>
            </form>
          </Panel>

          <Panel title="Status" icon={WalletCards}>
            <p className="text-sm leading-6 text-[#4b5563]">
              The app is running in free mode. Payments are disabled, and the AI coach uses Groq.
            </p>
          </Panel>
        </aside>
      </div>

      {isLoading && (
        <div className="fixed inset-0 flex items-center justify-center bg-white/70">
          <Loader2 className="animate-spin text-[#115e59]" size={28} />
        </div>
      )}
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6b7280]">{label}</p>
        <Icon className="text-[#115e59]" size={18} />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </section>
  )
}

function Panel({
  children,
  icon: Icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ElementType
  title: string
}) {
  return (
    <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="text-[#115e59]" size={18} />
        <h2 className="font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Input({
  label,
  onChange,
  type = 'text',
  value,
}: {
  label: string
  onChange: (value: string) => void
  type?: string
  value: string
}) {
  return (
    <label className="block text-sm font-medium text-[#374151]">
      {label}
      <input
        className="mt-2 h-10 w-full rounded-md border border-[#d8dde8] px-3 text-sm outline-none focus:border-[#115e59]"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function SubmitButton({ label = 'Add' }: { label?: string }) {
  return (
    <button className="mt-auto flex h-10 items-center justify-center gap-2 rounded-md bg-[#115e59] px-4 text-sm font-semibold text-white">
      <Plus size={16} />
      {label}
    </button>
  )
}

function ItemList({
  empty,
  items,
  onDelete,
}: {
  empty: string
  items: Array<{ id: string; meta: string; title: string; value: string }>
  onDelete: (id: string) => void
}) {
  if (items.length === 0) {
    return <p className="text-sm text-[#6b7280]">{empty}</p>
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-[#edf0f5] p-3"
          key={item.id}
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{item.title}</p>
            <p className="text-xs text-[#6b7280]">{item.meta}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <p className="text-sm font-semibold">{item.value}</p>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#9f1239] hover:bg-[#fff1f2]"
              onClick={() => onDelete(item.id)}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
