"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface AccountInfo {
  account: string;
  password: string;
  name: string;
  birth: string;
  nationality: string;
  phone: string;
}

export default function AdminAccounts() {
  const [accounts, setAccounts] = useState<AccountInfo[]>([]);
  const [selected, setSelected] = useState<AccountInfo | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetPwd, setResetPwd] = useState("");
  const [resetError, setResetError] = useState("");
  const [lockStatus, setLockStatus] = useState<{[account: string]: boolean}>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AccountInfo | null>(null);
  const [rawList, setRawList] = useState<any[]>([]);
  const router = useRouter();

  // 加载账号和锁定状态
  useEffect(() => {
    const list = JSON.parse(localStorage.getItem("registerList") || "[]");
    setRawList(list);
    const result = list.map((item: any) => {
      const account = (item.firstNameRomaji + item.lastNameRomaji).replace(/\s/g, '').toUpperCase();
      const password = localStorage.getItem('userPassword_' + account) || '';
      return {
        account,
        password,
        name: item.firstName + ' ' + item.lastName,
        birth: item.birth,
        nationality: item.nationality,
        phone: item.phone,
      };
    });
    setAccounts(result);
    // 加载锁定状态
    const lockObj: {[account: string]: boolean} = {};
    result.forEach((a: AccountInfo) => {
      lockObj[a.account] = localStorage.getItem('userLocked_' + a.account) === '1';
    });
    setLockStatus(lockObj);
  }, []);

  // 新增：根据账号查找原始资料
  const getRawByAccount = (account: string) => {
    return rawList.find(item => (item.firstNameRomaji + item.lastNameRomaji).replace(/\s/g, '').toUpperCase() === account);
  };

  // 详情弹窗
  const handleShowDetail = (a: AccountInfo) => {
    setSelected(a);
    setShowDetail(true);
  };

  // 重置密码弹窗
  const handleShowReset = (a: AccountInfo) => {
    setSelected(a);
    setResetPwd("");
    setResetError("");
    setShowReset(true);
  };

  // 重置密码逻辑
  const handleResetPwd = () => {
    if (!resetPwd || !/^[0-9]{6}$/.test(resetPwd)) {
      setResetError("密码必须为6位数字");
      return;
    }
    if (selected) {
      localStorage.setItem('userPassword_' + selected.account, resetPwd);
      setAccounts(accs => accs.map(a => a.account === selected.account ? { ...a, password: resetPwd } : a));
      setShowReset(false);
    }
  };

  // 锁定/解锁账号
  const handleToggleLock = (a: AccountInfo) => {
    const locked = lockStatus[a.account];
    if (locked) {
      localStorage.removeItem('userLocked_' + a.account);
    } else {
      localStorage.setItem('userLocked_' + a.account, '1');
    }
    setLockStatus(s => ({ ...s, [a.account]: !locked }));
  };

  // 删除账号
  const handleDelete = (a: AccountInfo) => {
    setPendingDelete(a);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const a = pendingDelete;
    // 删除 registerList
    const list = JSON.parse(localStorage.getItem("registerList") || "[]");
    const newList = list.filter((item: any) => (item.firstNameRomaji + item.lastNameRomaji).replace(/\s/g, '').toUpperCase() !== a.account);
    localStorage.setItem("registerList", JSON.stringify(newList));
    // 删除密码和锁定状态
    localStorage.removeItem('userPassword_' + a.account);
    localStorage.removeItem('userLocked_' + a.account);
    setAccounts(accs => accs.filter(acc => acc.account !== a.account));
    setLockStatus(s => {
      const copy = { ...s };
      delete copy[a.account];
      return copy;
    });
    setShowDeleteConfirm(false);
    setPendingDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setPendingDelete(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-8">
      <button
        className="mb-6 px-4 py-2 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500 self-start"
        onClick={() => router.back()}
      >
        返回
      </button>
      <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow">
        <h2 className="text-xl font-bold mb-4">员工账号信息</h2>
        <table className="w-full text-sm border">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-700">
              <th className="border px-2 py-1">账号</th>
              <th className="border px-2 py-1">密码</th>
              <th className="border px-2 py-1">姓名</th>
              <th className="border px-2 py-1">出生年月日</th>
              <th className="border px-2 py-1">国籍</th>
              <th className="border px-2 py-1">电话</th>
              <th className="border px-2 py-1">操作</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a, i) => (
              <tr key={i}>
                <td className="border px-2 py-1 font-mono">{a.account}</td>
                <td className="border px-2 py-1 font-mono">{a.password}</td>
                <td className="border px-2 py-1">{a.name}</td>
                <td className="border px-2 py-1">{a.birth}</td>
                <td className="border px-2 py-1">{a.nationality}</td>
                <td className="border px-2 py-1">{a.phone}</td>
                <td className="border px-2 py-1 flex flex-wrap gap-1">
                  <button
                    className="px-2 py-1 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500"
                    onClick={() => handleShowDetail(a)}
                  >详情</button>
                  <button
                    className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    onClick={() => handleDelete(a)}
                  >删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 详情弹窗 */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg">
            <h3 className="text-lg font-bold mb-4">账号详情</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="mb-2">账号：{selected.account}</div>
                <div className="mb-2">姓名：{selected.name}</div>
                <div className="mb-2">出生年月日：{selected.birth}</div>
                <div className="mb-2">国籍：{selected.nationality}</div>
                <div className="mb-2">电话：{selected.phone}</div>
                <div className="mb-2">当前密码：{selected.password}</div>
                <div className="mb-2">账号状态：{lockStatus[selected.account] ? '已锁定' : '正常'}</div>
              </div>
              {/* 新增：展示所有原始资料字段和照片 */}
              <div className="border-l pl-4">
                {(() => {
                  const raw = getRawByAccount(selected.account);
                  if (!raw) return null;
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(raw).map(([key, value]) => {
                          if (key === 'photos' && Array.isArray(value)) {
                            return (
                              <div key={key} className="col-span-2">
                                <span className="font-medium block mb-2">上传照片：</span>
                                <div className="flex flex-wrap gap-2">
                                  {value.map((img: string, idx: number) => (
                                    <img 
                                      key={idx} 
                                      src={img} 
                                      alt={`Photo ${idx + 1}`} 
                                      className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          } else if (typeof value === 'string' && value.startsWith('data:image/')) {
                            return (
                              <div key={key} className="col-span-2">
                                <span className="font-medium block mb-2">{key}：</span>
                                <img 
                                  src={value} 
                                  alt={key} 
                                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                                />
                              </div>
                            );
                          } else if (typeof value === 'string' && value.length > 0) {
                            return (
                              <div key={key}>
                                <span className="font-medium">{key}：</span>
                                <span className="ml-1">{value}</span>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500"
                onClick={() => setShowDetail(false)}
              >关闭</button>
            </div>
          </div>
        </div>
      )}
      {/* 重置密码弹窗 */}
      {showReset && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-4">重置密码</h3>
            <div className="mb-2">账号：{selected.account}</div>
            <input
              className="border rounded px-3 py-2 w-full mb-2"
              placeholder="请输入新密码（6位数字）"
              value={resetPwd}
              maxLength={6}
              onChange={e => setResetPwd(e.target.value.replace(/[^0-9]/g, ''))}
            />
            {resetError && <div className="text-red-500 text-sm mb-2">{resetError}</div>}
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500"
                onClick={() => setShowReset(false)}
              >取消</button>
              <button
                className="px-4 py-2 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500"
                onClick={handleResetPwd}
              >确定重置</button>
            </div>
          </div>
        </div>
      )}
      {/* 删除确认弹窗 */}
      {showDeleteConfirm && pendingDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-md shadow-lg">
            <h3 className="text-lg font-bold mb-4 text-red-600">警告</h3>
            <div className="mb-4">确定要删除账号 <span className="font-mono text-lg text-red-600">{pendingDelete.account}</span> 吗？此操作不可恢复！</div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded font-medium transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl border border-blue-600 hover:border-blue-500"
                onClick={cancelDelete}
              >取消</button>
              <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 