import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Settings2 } from "lucide-react";
import { Brand } from "./components/UI";
import Admin from "./components/Admin";
import { useRealm } from "./store";

export default function AdminPage() {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const notice = (message) => {
    clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(null), 4500);
  };
  const realm = useRealm(notice, { allowSnapshots: true });
  useEffect(() => {
    document.title = "管理后台 · 灵石仙宗";
    return () => clearTimeout(timer.current);
  }, []);
  return (
    <>
      <header className="site-header">
        <div className="header-inner admin-header">
          <Brand href="/" />
          <a href="/" className="button outline">
            <ArrowLeft size={16} />
            返回仙宗
          </a>
        </div>
      </header>
      <main className="admin-page">
        <div className="admin-page-heading">
          <span className="eyebrow">REALM CONSOLE</span>
          <h1>
            <Settings2 size={28} />
            管理后台
          </h1>
          <p>配置灵石供应量、Holder 与快照规则。</p>
        </div>
        <Admin {...realm} notice={notice} />
      </main>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </>
  );
}
