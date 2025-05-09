"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterComplete() {
  const router = useRouter();
  const [form, setForm] = useState<any>({});
  const [createAccount, setCreateAccount] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [account, setAccount] = useState('');
  const [lang, setLang] = useState<'zh' | 'ja'>('zh');

  useEffect(() => {
    // 读取最新注册信息
    const list = JSON.parse(localStorage.getItem("registerList") || "[]");
    if (list.length > 0) {
      setForm(list[list.length - 1]);
      setAccount(
        (list[list.length - 1].firstNameRomaji + list[list.length - 1].lastNameRomaji).replace(/\s/g, '').toUpperCase()
      );
      setLang(list[list.length - 1].lang || 'zh');
    }
  }, []);

  const texts = {
    zh: {
      title: "提交成功",
      tip: "如需后期管理和编辑自己的信息，可选择创建账号。",
      create: "创建账号",
      account: "账号：",
      pwd: "请输入密码（6位数字）",
      pwd2: "请再次输入密码",
      pwdErr1: "请输入密码并确认",
      pwdErr2: "两次输入的密码不一致",
      pwdErr3: "密码必须为6位数字",
      finish: "完成"
    },
    ja: {
      title: "登録完了",
      tip: "後で自分の情報を管理・編集したい場合は、アカウント作成を選択できます。",
      create: "アカウント作成",
      account: "アカウント：",
      pwd: "パスワード（6桁の数字）を入力してください",
      pwd2: "パスワード（再入力）",
      pwdErr1: "パスワードを入力し、確認してください",
      pwdErr2: "パスワードが一致しません",
      pwdErr3: "パスワードは6桁の数字である必要があります",
      finish: "完了"
    }
  };

  const handleFinish = () => {
    if (createAccount) {
      if (!password || !confirmPassword) {
        setPasswordError(texts[lang].pwdErr1);
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError(texts[lang].pwdErr2);
        return;
      }
      if (!/^[0-9]{6}$/.test(password)) {
        setPasswordError(texts[lang].pwdErr3);
        return;
      }
      // 保存账号密码
      localStorage.setItem('userPassword_' + account, password);
    }
    setPasswordError('');
    router.push('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-8 max-w-md w-full flex flex-col items-center">
        <h2 className="text-2xl font-bold mb-4">{texts[lang].title}</h2>
        <p className="mb-4 text-center">{texts[lang].tip}</p>
        <label className="flex items-center gap-2 mb-4">
          <input type="checkbox" checked={createAccount} onChange={e => setCreateAccount(e.target.checked)} />
          {texts[lang].create}
        </label>
        {createAccount && (
          <div className="w-full flex flex-col gap-2 mb-4">
            <div>
              <span className="font-semibold">{texts[lang].account}</span>
              <span className="ml-2">{account}</span>
            </div>
            <input
              type="password"
              className="border rounded px-3 py-2"
              placeholder={texts[lang].pwd}
              value={password}
              onChange={e => setPassword(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={6}
            />
            <input
              type="password"
              className="border rounded px-3 py-2"
              placeholder={texts[lang].pwd2}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={6}
            />
            {passwordError && <div className="text-red-500 text-sm">{passwordError}</div>}
          </div>
        )}
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
          onClick={handleFinish}
        >
          {texts[lang].finish}
        </button>
      </div>
    </div>
  );
} 