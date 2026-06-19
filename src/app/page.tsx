import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  Bot,
  CalendarDays,
  CreditCard,
  IndianRupee,
  LayoutDashboard,
  PiggyBank,
  Plus,
  Search,
  Target,
  WalletCards,
} from "lucide-react";

export default function Home() {
  const expenses = [
    { label: "Rent", value: "Rs 24,000", tone: "bg-[#eef2ff] text-[#3730a3]" },
    { label: "Groceries", value: "Rs 7,850", tone: "bg-[#ecfdf5] text-[#047857]" },
    { label: "Transport", value: "Rs 3,240", tone: "bg-[#fff7ed] text-[#c2410c]" },
  ];

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-[#15171c]">
      <main className="mx-auto flex min-h-screen w-full max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-[#e6e8ef] bg-white px-5 py-6 lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#115e59] text-white">
              <IndianRupee size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">FinCoach AI</p>
              <p className="text-xs text-[#6b7280]">Frontend preview</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1 text-sm">
            {[
              ["Overview", LayoutDashboard],
              ["Expenses", CreditCard],
              ["Goals", Target],
              ["Coach", Bot],
            ].map(([label, Icon]) => (
              <button
                key={label as string}
                className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-left font-medium text-[#4b5563] hover:bg-[#f3f4f6]"
              >
                <Icon size={17} />
                {label as string}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 items-center justify-between border-b border-[#e6e8ef] bg-white px-4 sm:px-8">
            <div>
              <h1 className="text-lg font-semibold text-[#111827]">Financial Overview</h1>
              <p className="text-xs text-[#6b7280]">Static frontend mode</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden h-9 items-center gap-2 rounded-md border border-[#d7dbe5] px-3 text-sm text-[#4b5563] sm:flex">
                <Search size={16} />
                Search
              </button>
              <button className="flex h-9 w-9 items-center justify-center rounded-md border border-[#d7dbe5] text-[#4b5563]">
                <Bell size={16} />
              </button>
            </div>
          </header>

          <div className="grid gap-5 px-4 py-6 sm:px-8 xl:grid-cols-[1fr_340px]">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <Metric title="Monthly income" value="Rs 92,000" icon={ArrowUpRight} accent="text-[#047857]" />
                <Metric title="Monthly expenses" value="Rs 48,430" icon={ArrowDownRight} accent="text-[#b91c1c]" />
                <Metric title="Savings rate" value="47.4%" icon={PiggyBank} accent="text-[#115e59]" />
              </div>

              <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold">Expense Breakdown</h2>
                    <p className="text-sm text-[#6b7280]">Sample data, no backend attached</p>
                  </div>
                  <button className="flex h-9 items-center gap-2 rounded-md bg-[#115e59] px-3 text-sm font-medium text-white">
                    <Plus size={16} />
                    Add
                  </button>
                </div>
                <div className="mt-5 space-y-3">
                  {expenses.map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-md border border-[#edf0f5] p-3">
                      <span className={`rounded-md px-2 py-1 text-xs font-medium ${item.tone}`}>{item.label}</span>
                      <span className="text-sm font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
                <div className="flex items-center gap-3">
                  <Bot className="text-[#115e59]" size={22} />
                  <div>
                    <h2 className="text-base font-semibold">AI Coach</h2>
                    <p className="text-sm text-[#6b7280]">Preview response without API calls</p>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-[#f5f7fb] p-4 text-sm leading-6 text-[#374151]">
                  You are on track this month. Keep discretionary spending under Rs 9,000 for the next two weeks to stay aligned with your savings goal.
                </div>
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Primary Goal</h2>
                  <Target size={18} className="text-[#115e59]" />
                </div>
                <p className="mt-4 text-3xl font-semibold">Rs 1.8L</p>
                <p className="mt-1 text-sm text-[#6b7280]">Emergency fund target</p>
                <div className="mt-5 h-2 rounded-full bg-[#e5e7eb]">
                  <div className="h-2 w-[62%] rounded-full bg-[#115e59]" />
                </div>
              </section>

              <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
                <h2 className="text-base font-semibold">Upcoming</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <PreviewRow icon={CalendarDays} label="SIP debit" value="24 Jun" />
                  <PreviewRow icon={WalletCards} label="Card payment" value="28 Jun" />
                  <PreviewRow icon={PiggyBank} label="Goal top-up" value="30 Jun" />
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  title,
  value,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <section className="rounded-lg border border-[#e1e5ee] bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#6b7280]">{title}</p>
        <Icon className={accent} size={18} />
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
    </section>
  );
}

function PreviewRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-md bg-[#f7f8fb] p-3">
      <span className="flex items-center gap-2 text-[#4b5563]">
        <Icon size={16} />
        {label}
      </span>
      <span className="font-medium text-[#111827]">{value}</span>
    </div>
  );
}
