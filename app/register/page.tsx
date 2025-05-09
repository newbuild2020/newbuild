"use client";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { parseBirthInput, calcAge } from '@/utils/NotoSansSC';

// RegisterForm 类型声明
interface RegisterForm {
  firstName: string;
  lastName: string;
  firstNameFurigana: string;
  lastNameFurigana: string;
  firstNameRomaji: string;
  lastNameRomaji: string;
  gender: string;
  birth: string;
  age: string;
  nationality: string;
  nationalityOther: string;
  visa: string;
  visaOther: string;
  visaDate: string;
  jobs: string[];
  exp: string;
  expYear: string;
  expMonth: string;
  zip: string;
  address: string;
  detailAddress: string;
  selectedChome: string;
  phone: string;
  healthDate: string;
  bpHigh: string;
  bpLow: string;
  blood: string;
  emgName: string;
  emgFurigana: string;
  emgPhone: string;
  emgAddress: string;
  emgSame: boolean;
  insuranceDate: string;
  emgDetailAddress: string;
  emgSelectedChome: string;
  relationship: string;
  relationshipOther: string;
  emgZip: string;
}

// 日期处理函数返回类型
interface DateParseResult {
  date: string;
  age: string;
}

// カタカナ转换
function toKatakana(input: string) {
  return input.replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))
    .replace(/[^ァ-ンー]/g, "");
}
// 罗马字大写
function toUpperAlpha(input: string) {
  return input.replace(/[^A-Z]/gi, "").toUpperCase();
}
// 电话格式化
function formatJPPhone(input: string) {
  const num = input.replace(/\D/g, "");
  if (num.length <= 3) return num;
  if (num.length <= 7) return `${num.slice(0,3)}-${num.slice(3)}`;
  return `${num.slice(0,3)}-${num.slice(3,7)}-${num.slice(7,11)}`;
}
// 邮编格式化
function formatJPZip(input: string) {
  const num = input.replace(/\D/g, "");
  if (num.length <= 3) return num;
  return `${num.slice(0,3)}-${num.slice(3,7)}`;
}
// 日期格式化（8位数字转yyyy-mm-dd）
function formatDate8(input: string) {
  const num = input.replace(/\D/g, "");
  if (num.length === 0) return '';
  if (num.length <= 4) return num;
  if (num.length <= 6) {
    const year = num.slice(0, 4);
    const month = num.slice(4);
    // 验证月份
    if (parseInt(month) > 12) return `${year}-12`;
    return `${year}-${month}`;
  }
  
  const year = num.slice(0, 4);
  const month = num.slice(4, 6);
  const day = num.slice(6, 8);
  
  // 验证月份
  if (parseInt(month) > 12) return `${year}-12-${day}`;
  
  // 验证日期
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  if (isNaN(date.getTime())) {
    // 如果日期无效，返回到月份
    return `${year}-${month}`;
  }
  
  return `${year}-${month}-${day}`;
}

// 地址API
async function fetchJPAddress(zip: string) {
  if (!/^\d{3}-\d{4}$/.test(zip)) return '';
  try {
    const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip.replace('-', '')}`);
    const data = await res.json();
    if (data && data.results && data.results[0]) {
      const r = data.results[0];
      return `${r.address1}${r.address2}${r.address3}`;
    }
  } catch {}
  return '';
}

// 日本血压判定
function getBloodPressureStatus(sbp: string, dbp: string, lang: 'zh' | 'ja') {
  const s = parseInt(sbp, 10);
  const d = parseInt(dbp, 10);
  if (!sbp || !dbp || isNaN(s) || isNaN(d)) return '';
  if (s < 90 || d < 60) return lang === 'zh' ? '低血压' : '低血圧';
  if (s < 120 && d < 80) return lang === 'zh' ? '正常' : '正常';
  if (s >= 120 && s <= 129 && d < 80) return lang === 'zh' ? '正常高值' : '正常高値';
  if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return lang === 'zh' ? '高血压前期' : '高血圧前期';
  if ((s >= 140 && s <= 159) || (d >= 90 && d <= 99)) return lang === 'zh' ? '1级高血压' : '高血圧1度';
  if ((s >= 160 && s <= 179) || (d >= 100 && d <= 109)) return lang === 'zh' ? '2级高血压' : '高血圧2度';
  if (s >= 180 || d >= 110) return lang === 'zh' ? '3级高血压' : '高血圧3度';
  return '';
}

export default function Register() {
  const [lang, setLang] = useState<'zh' | 'ja'>("zh");
  const [form, setForm] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    firstNameFurigana: "",
    lastNameFurigana: "",
    firstNameRomaji: "",
    lastNameRomaji: "",
    gender: "",
    birth: "",
    age: "",
    nationality: "",
    nationalityOther: "",
    visa: "",
    visaOther: "",
    visaDate: "",
    jobs: [],
    exp: "",
    expYear: "",
    expMonth: "",
    zip: "",
    address: "",
    detailAddress: "",
    selectedChome: "",
    phone: "",
    healthDate: "",
    bpHigh: "",
    bpLow: "",
    blood: "",
    emgName: "",
    emgFurigana: "",
    emgPhone: "",
    emgAddress: "",
    emgSame: false,
    insuranceDate: "",
    emgDetailAddress: "",
    emgSelectedChome: "",
    relationship: "",
    relationshipOther: "",
    emgZip: "",
  });
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const router = useRouter();

  // 地址自动填充
  const [zipError, setZipError] = useState('');
  const [autoAddress, setAutoAddress] = useState('');
  useEffect(() => {
    const zip = form.zip.replace(/\D/g, '');
    if (zip.length === 7) {
      const jpzip = formatJPZip(zip);
      fetchJPAddress(jpzip).then(addr => {
        if (addr) {
          setAutoAddress(addr);
          setZipError('');
        } else {
          setAutoAddress('');
          setZipError(lang === 'zh' ? '邮编无效' : '郵便番号が正しくありません');
        }
      });
    } else {
      setAutoAddress('');
      setZipError('');
    }
  }, [form.zip, lang]);

  // 紧急联系人邮编/地址自动填充
  const [emgZipError, setEmgZipError] = useState('');
  const [emgAutoAddress, setEmgAutoAddress] = useState('');
  useEffect(() => {
    const zip = form.emgZip.replace(/\D/g, '');
    if (zip.length === 7) {
      const jpzip = formatJPZip(zip);
      fetchJPAddress(jpzip).then(addr => {
        if (addr) {
          setEmgAutoAddress(addr);
          setEmgZipError('');
        } else {
          setEmgAutoAddress('');
          setEmgZipError(lang === 'zh' ? '邮编无效' : '郵便番号が正しくありません');
        }
      });
    } else {
      setEmgAutoAddress('');
      setEmgZipError('');
    }
  }, [form.emgZip, lang]);

  // 语言切换按钮
  const langSwitch = (
    <div className="absolute top-4 right-4 flex gap-2 z-50">
      <button
        className={`px-3 py-1.5 rounded-full text-sm border border-[#d2d2d7] hover:bg-[#f5f5f7] dark:border-[#424245] dark:hover:bg-[#1d1d1f] transition-colors ${lang === "zh" ? "bg-[#f5f5f7] dark:bg-[#1d1d1f]" : ""}`}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
      <button
        className={`px-3 py-1.5 rounded-full text-sm border border-[#d2d2d7] hover:bg-[#f5f5f7] dark:border-[#424245] dark:hover:bg-[#1d1d1f] transition-colors ${lang === "ja" ? "bg-[#f5f5f7] dark:bg-[#1d1d1f]" : ""}`}
        onClick={() => setLang("ja")}
      >
        日本語
      </button>
    </div>
  );

  // 表单字段更新
  const updateForm = useCallback(<K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  // 日期输入处理
  const handleDateInput = useCallback((field: string, value: string) => {
    // 限制输入长度为8位数字
    const num = value.replace(/\D/g, "");
    if (num.length > 8) return;
    
    const formattedValue = formatDate8(value);
    
    if (field === 'birth') {
      if (formattedValue.length === 10) {
        const dateObj = new Date(formattedValue);
        if (!isNaN(dateObj.getTime())) {
          const age = calcAge(dateObj);
          updateForm('birth', formattedValue);
          updateForm('age', age.toString());
        } else {
          updateForm('birth', formattedValue);
          updateForm('age', '');
        }
      } else {
        updateForm('birth', formattedValue);
        updateForm('age', '');
      }
    } else {
      updateForm(field as keyof RegisterForm, formattedValue);
    }
  }, [updateForm]);

  // 日期字段组件
  const DateInput = useCallback(({ field, label, watermark, error }: { field: keyof RegisterForm, label: string, watermark: string, error?: string }) => (
    <div className="flex flex-col mt-4">
      <label className="font-medium mb-1">{label}</label>
      {watermarkLabel(watermark)}
      <div className="relative">
        <input
          className={`border rounded px-3 py-2 w-full ${error ? 'border-red-500' : ''}`}
          type="text"
          value={form[field] as string}
          onChange={e => {
            // 只允许数字输入
            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 8);
            updateForm(field, raw);
          }}
          placeholder={watermark}
          maxLength={8}
        />
        {(form[field] as string)?.length === 8 && !error && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500">
            ✓
          </div>
        )}
      </div>
      {error && <span className="text-red-500 text-sm mt-1">{error}</span>}
    </div>
  ), [form, updateForm]);

  // 水印标注
  const watermarkLabel = (text: string) => (
    <div className="relative">
      <span className="absolute -top-2 left-2 px-1 text-xs text-gray-500 bg-white dark:bg-neutral-800">
        {text}
      </span>
    </div>
  );

  // 日期验证函数
  const validateDate = useCallback((date: string, field: string) => {
    if (!date) return '';
    
    // 检查日期格式
    const dateRegex = /^\d{8}$/;
    if (!dateRegex.test(date)) {
      return lang === 'zh' ? '日期格式错误' : '日付形式エラー';
    }

    const year = parseInt(date.slice(0, 4));
    const month = parseInt(date.slice(4, 6));
    const day = parseInt(date.slice(6, 8));
    const dateObj = new Date(year, month - 1, day);
    if (isNaN(dateObj.getTime())) {
      return lang === 'zh' ? '无效日期' : '無効な日付';
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 根据不同字段进行验证
    switch (field) {
      case 'birth':
        if (dateObj > today) {
          return lang === 'zh' ? '出生日期不能晚于今天' : '生年月日は本日以前を入力してください';
        }
        const age = calcAge(dateObj);
        if (typeof age === 'number' && age < 16) {
          return lang === 'zh' ? '年龄必须大于16岁' : '16歳以上である必要があります';
        }
        break;
      case 'visaDate':
      case 'insuranceDate':
        if (dateObj < today) {
          return lang === 'zh' ? '日期不能早于今天' : '本日以前の日付は選択できません';
        }
        // 检查是否超过10年
        const tenYearsLater = new Date(today);
        tenYearsLater.setFullYear(today.getFullYear() + 10);
        if (dateObj > tenYearsLater) {
          return lang === 'zh' ? '日期不能超过10年' : '10年以内の日付を選択してください';
        }
        break;
      case 'healthDate':
        const oneYearAgo = new Date(today);
        oneYearAgo.setFullYear(today.getFullYear() - 1);
        if (dateObj < oneYearAgo || dateObj > today) {
          return lang === 'zh' ? '日期只能选当天起1年以内' : '本日から1年以内の日付のみ選択可能';
        }
        break;
    }

    return '';
  }, [lang]);

  // 表单验证
  const validateForm = useCallback(() => {
    const errors: {[key: string]: string} = {};
    
    // 基本信息验证
    if (!form.firstName) errors.firstName = lang === 'zh' ? '请输入姓' : '姓を入力してください';
    if (!form.lastName) errors.lastName = lang === 'zh' ? '请输入名' : '名を入力してください';
    if (!form.firstNameFurigana) errors.firstNameFurigana = lang === 'zh' ? '请输入姓(ふりがな)' : '姓(ふりがな)を入力してください';
    if (!form.lastNameFurigana) errors.lastNameFurigana = lang === 'zh' ? '请输入名(ふりがな)' : '名(ふりがな)を入力してください';
    if (!form.gender) errors.gender = lang === 'zh' ? '请选择性别' : '性別を選択してください';
    
    // 日期验证
    const birthError = validateDate(form.birth, 'birth');
    if (birthError) errors.birth = birthError;

    if (form.nationality !== '日本') {
      if (!form.visa) errors.visa = lang === 'zh' ? '请输入在留资格' : '在留資格を入力してください';
      const visaDateError = validateDate(form.visaDate, 'visaDate');
      if (visaDateError) errors.visaDate = visaDateError;
    }

    const insuranceDateError = validateDate(form.insuranceDate, 'insuranceDate');
    if (insuranceDateError) errors.insuranceDate = insuranceDateError;

    const healthDateError = validateDate(form.healthDate, 'healthDate');
    if (healthDateError) errors.healthDate = healthDateError;

    // 其他验证...
    if (!form.phone) errors.phone = lang === 'zh' ? '请输入电话号码' : '電話番号を入力してください';
    if (!form.emgName) errors.emgName = lang === 'zh' ? '请输入紧急联系人姓名' : '緊急連絡先氏名を入力してください';
    if (!form.emgPhone) errors.emgPhone = lang === 'zh' ? '请输入紧急联系人电话' : '緊急連絡先電話番号を入力してください';
    if (!form.relationship) errors.relationship = lang === 'zh' ? '请选择与本人关系' : '本人との関係を選択してください';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form, lang, validateDate]);

  // 提交
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  }, [validateForm]);

  // 确认提交
  const handleConfirmSubmit = useCallback(() => {
    // 保存到 localStorage
    localStorage.setItem('registerList', JSON.stringify([{ ...form, lang }]));
    setShowConfirmModal(false);
    setRegisterSuccess(true);
    // 跳转到上传页面
    router.push("/register/upload");
  }, [form, lang, router]);

  // 工种"其他"逻辑
  const [jobOther, setJobOther] = useState('');

  // 紧急联系人"同上"逻辑
  useEffect(() => {
    if (form.emgSame) {
      updateForm('emgZip', form.zip);
      setEmgAutoAddress(autoAddress);
      updateForm('emgAddress', autoAddress);
      updateForm('emgDetailAddress', form.detailAddress);
      updateForm('emgPhone', form.phone);
    }
  }, [form.emgSame, form.zip, autoAddress, form.detailAddress, form.phone, updateForm]);

  // ふりがな/罗马字/电话/邮编/日期输入处理
  const handleInput = useCallback((field: keyof RegisterForm, value: string) => {
    if (field === 'firstNameFurigana' || field === 'lastNameFurigana' || field === 'emgFurigana') {
      updateForm(field, toKatakana(value));
    } else if (field === 'firstNameRomaji' || field === 'lastNameRomaji') {
      updateForm(field, toUpperAlpha(value));
    } else if (field === 'phone' || field === 'emgPhone') {
      updateForm(field, formatJPPhone(value));
    } else if (field === 'zip') {
      updateForm(field, formatJPZip(value));
    } else if (field === 'emgZip') {
      updateForm(field, formatJPZip(value));
    } else {
      updateForm(field, value);
    }
  }, [updateForm]);

  // 血压输入校验和健康等级
  let bpError = '';
  let bpStatus = '';
  let bpStatusColor = '';
  const s = parseInt(form.bpHigh, 10);
  const d = parseInt(form.bpLow, 10);
  if (form.bpHigh || form.bpLow) {
    if (
      !form.bpHigh || !form.bpLow ||
      isNaN(s) || isNaN(d) ||
      s < 80 || s > 250 ||
      d < 40 || d > 150
    ) {
      bpError = lang === 'zh' ? '请输入合理的血压值（高压80~250，低压40~150）' : '正しい血圧値を入力してください（収縮期80~250、拡張期40~150）';
    } else {
      bpStatus = getBloodPressureStatus(form.bpHigh, form.bpLow, lang);
      if (bpStatus.includes('正常')) {
        bpStatusColor = 'text-green-600';
      } else if (bpStatus.includes('高') && !bpStatus.includes('正常')) {
        bpStatusColor = 'text-red-500';
      } else if (bpStatus.includes('低')) {
        bpStatusColor = 'text-yellow-500';
      } else {
        bpStatusColor = 'text-gray-600';
      }
    }
  }

  // 在留资格选项
  const visaOptions = [
    { value: '', label: lang === 'zh' ? '请选择' : '選択してください' },
    { value: '技术・人文知识・国际业务', label: lang === 'zh' ? '技术・人文知识・国际业务' : '技術・人文知識・国際業務' },
    { value: '技能', label: lang === 'zh' ? '技能' : '技能' },
    { value: '特定技能', label: lang === 'zh' ? '特定技能' : '特定技能' },
    { value: '永住者', label: lang === 'zh' ? '永住者' : '永住者' },
    { value: '定住者', label: lang === 'zh' ? '定住者' : '定住者' },
    { value: '家族滞在', label: lang === 'zh' ? '家族滞在' : '家族滞在' },
    { value: '留学', label: lang === 'zh' ? '留学' : '留学' },
    { value: '其他', label: lang === 'zh' ? '其他' : 'その他' },
  ];
  // 工种选项
  const jobOptions = ["LGS", "PB", "造作", lang === "zh" ? "其他" : "その他"];

  // 健康诊断日区间
  const today = new Date();
  const healthMin = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate() + 1);
  const healthMinStr = `${healthMin.getFullYear()}/${String(healthMin.getMonth() + 1).padStart(2, '0')}/${String(healthMin.getDate()).padStart(2, '0')}`;
  const healthMaxStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}`;

  // 劳灾保险到期区间
  let insuranceMax = '';
  if (today.getMonth() + 1 > 3 || (today.getMonth() + 1 === 3 && today.getDate() > 31)) {
    // 3月31日后
    insuranceMax = `${today.getFullYear() + 1}-03-31`;
  } else {
    insuranceMax = `${today.getFullYear()}-03-31`;
  }
  const insuranceMaxDisp = insuranceMax.replace(/-/g, '/');
  const insuranceMin = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const insuranceMinDisp = insuranceMin.replace(/-/g, '/');

  // 校验函数
  function validatePhone(phone: string) {
    // 日本手机号格式 例: 090-1234-5678
    return /^0\d{2}-\d{4}-\d{4}$/.test(phone);
  }
  function validateZip(zip: string) {
    return /^\d{3}-\d{4}$/.test(zip);
  }
  function validateDate8(date: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(new Date(date).getTime());
  }

  // 测试数据填充
  const fillTestData = () => {
    // 动态日期
    const today = new Date();
    // 出生日期：18岁生日
    const birthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const birthStr = `${birthDate.getFullYear()}${String(birthDate.getMonth() + 1).padStart(2, '0')}${String(birthDate.getDate()).padStart(2, '0')}`;
    // 在留卡期限：今天+1年
    const visaDateObj = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
    const visaDateStr = `${visaDateObj.getFullYear()}${String(visaDateObj.getMonth() + 1).padStart(2, '0')}${String(visaDateObj.getDate()).padStart(2, '0')}`;
    // 健康诊断日：今天
    const healthDateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    // 劳灾保险到期区间
    let insuranceDateStr = '';
    if (today.getMonth() + 1 > 3 || (today.getMonth() + 1 === 3 && today.getDate() > 31)) {
      insuranceDateStr = `${today.getFullYear() + 1}0331`;
    } else {
      insuranceDateStr = `${today.getFullYear()}0331`;
    }
    setForm({
      firstName: '张',
      lastName: '三',
      firstNameFurigana: 'チョウ',
      lastNameFurigana: 'サン',
      firstNameRomaji: 'ZHANG',
      lastNameRomaji: 'SAN',
      gender: '男',
      birth: birthStr,
      age: '18',
      nationality: '中国',
      nationalityOther: '',
      visa: '技术・人文知识・国际业务',
      visaOther: '',
      visaDate: visaDateStr,
      jobs: ['LGS'],
      exp: '',
      expYear: '5',
      expMonth: '6',
      zip: '232-0033',
      address: '東京都新宿区',
      detailAddress: 'テストビル101',
      selectedChome: '',
      phone: '090-1234-1234',
      healthDate: healthDateStr,
      bpHigh: '120',
      bpLow: '80',
      blood: 'A',
      emgName: '李四',
      emgFurigana: 'リシ',
      emgPhone: '090-1234-1234',
      emgAddress: '東京都新宿区',
      emgSame: false,
      insuranceDate: insuranceDateStr,
      emgDetailAddress: 'テストビル102',
      emgSelectedChome: '',
      relationship: '父母',
      relationshipOther: '',
      emgZip: '232-0033',
    });
    setFormErrors({});
  };

  // 成功页
  if (registerSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-8 max-w-md w-full flex flex-col items-center">
          <h2 className="text-2xl font-bold mb-4">{lang === 'zh' ? '提交成功' : '登録完了'}</h2>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full mt-4"
            onClick={() => router.push("/")}
          >
            {lang === 'zh' ? '返回首页' : 'トップページへ戻る'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 relative">
      {langSwitch}
      <h1 className="text-3xl font-bold mb-8 mt-2 text-center w-full">{lang === 'zh' ? '名簿登陆' : '新規名簿登録'}</h1>
      <form className="w-full max-w-2xl space-y-4" onSubmit={handleSubmit}>
        {/* 基本信息 */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "姓" : "姓"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.firstName ? 'border-red-500' : ''}`} value={form.firstName} onChange={e => handleInput('firstName', e.target.value)} />
              {formErrors.firstName && <span className="text-red-500 text-sm mt-1">{formErrors.firstName}</span>}
            </div>
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "名" : "名"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.lastName ? 'border-red-500' : ''}`} value={form.lastName} onChange={e => handleInput('lastName', e.target.value)} />
              {formErrors.lastName && <span className="text-red-500 text-sm mt-1">{formErrors.lastName}</span>}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "姓(ふりがな)" : "姓(ふりがな)"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.firstNameFurigana ? 'border-red-500' : ''}`} value={form.firstNameFurigana} onChange={e => handleInput('firstNameFurigana', e.target.value)} />
              {formErrors.firstNameFurigana && <span className="text-red-500 text-sm mt-1">{formErrors.firstNameFurigana}</span>}
            </div>
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "名(ふりがな)" : "名(ふりがな)"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.lastNameFurigana ? 'border-red-500' : ''}`} value={form.lastNameFurigana} onChange={e => handleInput('lastNameFurigana', e.target.value)} />
              {formErrors.lastNameFurigana && <span className="text-red-500 text-sm mt-1">{formErrors.lastNameFurigana}</span>}
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "姓(罗马字)" : "姓(ローマ字)"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.firstNameRomaji ? 'border-red-500' : ''}`} value={form.firstNameRomaji} onChange={e => handleInput('firstNameRomaji', e.target.value)} />
              {formErrors.firstNameRomaji && <span className="text-red-500 text-sm mt-1">{formErrors.firstNameRomaji}</span>}
            </div>
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "名(罗马字)" : "名(ローマ字)"}</label>
              <input className={`border rounded px-3 py-2 ${formErrors.lastNameRomaji ? 'border-red-500' : ''}`} value={form.lastNameRomaji} onChange={e => handleInput('lastNameRomaji', e.target.value)} />
              {formErrors.lastNameRomaji && <span className="text-red-500 text-sm mt-1">{formErrors.lastNameRomaji}</span>}
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "性别" : "性別"}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-1">
                <input type="radio" name="gender" value="男" checked={form.gender === "男"} onChange={e => handleInput('gender', e.target.value)} />
                {lang === "zh" ? "男" : "男"}
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="gender" value="女" checked={form.gender === "女"} onChange={e => handleInput('gender', e.target.value)} />
                {lang === "zh" ? "女" : "女"}
              </label>
            </div>
            {formErrors.gender && <span className="text-red-500 text-sm mt-1">{formErrors.gender}</span>}
          </div>
          {/* 出生年月日 */}
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === 'zh' ? '出生年月日' : '生年月日'}</label>
            <input
              className={`border rounded px-3 py-2 w-full ${formErrors.birth ? 'border-red-500' : ''}`}
              type="text"
              value={form.birth}
              onChange={e => handleInput('birth', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              onBlur={e => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                if (raw.length === 8) {
                  const y = raw.slice(0, 4);
                  const m = raw.slice(4, 6);
                  const d = raw.slice(6, 8);
                  handleInput('birth', `${y}-${m}-${d}`);
                }
              }}
              placeholder={lang === 'zh' ? '例：19900101' : '例：19900101'}
              maxLength={8}
            />
            {formErrors.birth && <span className="text-red-500 text-sm mt-1">{formErrors.birth}</span>}
          </div>
          {form.age && (
            <div className="flex items-center px-3 py-2 bg-gray-100 dark:bg-neutral-700 rounded mt-2">
              {form.age}{lang === 'zh' ? '岁' : '歳'}
            </div>
          )}
        </div>

        {/* 国籍信息 */}
        <div className="mb-8">
          <div className="flex flex-col">
            <label className="font-medium mb-1">{lang === "zh" ? "国籍" : "国籍"}</label>
            <select className={`border rounded px-3 py-2 ${formErrors.nationality ? 'border-red-500' : ''}`} value={form.nationality} onChange={e => handleInput('nationality', e.target.value)}>
              <option value="">{lang === "zh" ? "请选择" : "選択してください"}</option>
              <option value="中国">{lang === "zh" ? "中国" : "中国"}</option>
              <option value="日本">{lang === "zh" ? "日本" : "日本"}</option>
              <option value="其他">{lang === "zh" ? "其他" : "その他"}</option>
            </select>
            {form.nationality === "其他" && (
              <input className="border rounded px-3 py-2 mt-2" placeholder={lang === "zh" ? "请输入其他国籍" : "その他の国籍を入力"} value={form.nationalityOther} onChange={e => handleInput('nationalityOther', e.target.value)} />
            )}
            {formErrors.nationality && <span className="text-red-500 text-sm mt-1">{formErrors.nationality}</span>}
          </div>
          {form.nationality !== "日本" && (
            <>
              <div className="flex flex-col mt-4">
                <label className="font-medium mb-1">{lang === "zh" ? "在留资格" : "在留資格"}</label>
                <select className={`border rounded px-3 py-2 ${formErrors.visa ? 'border-red-500' : ''}`} value={form.visa} onChange={e => handleInput('visa', e.target.value)}>
                  {visaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {form.visa === '其他' && (
                  <input className="border rounded px-3 py-2 mt-2" placeholder={lang === "zh" ? "请输入其他在留资格" : "その他の在留資格を入力"} value={form.visaOther} onChange={e => handleInput('visaOther', e.target.value)} />
                )}
                {formErrors.visa && <span className="text-red-500 text-sm mt-1">{formErrors.visa}</span>}
              </div>
              {/* 在留卡期限 */}
              <div className="flex flex-col mt-4">
                <label className="font-medium mb-1">{lang === 'zh' ? '在留卡期限' : '在留カード期限'}</label>
                <input
                  className={`border rounded px-3 py-2 w-full ${formErrors.visaDate ? 'border-red-500' : ''}`}
                  type="text"
                  value={form.visaDate}
                  onChange={e => handleInput('visaDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                  onBlur={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    if (raw.length === 8) {
                      const y = raw.slice(0, 4);
                      const m = raw.slice(4, 6);
                      const d = raw.slice(6, 8);
                      handleInput('visaDate', `${y}-${m}-${d}`);
                    }
                  }}
                  placeholder={lang === 'zh' ? '例：20250101' : '例：20250101'}
                  maxLength={8}
                />
                {formErrors.visaDate && <span className="text-red-500 text-sm mt-1">{formErrors.visaDate}</span>}
              </div>
            </>
          )}
        </div>

        {/* 工作信息 */}
        <div className="mb-8">
          <div className="flex flex-col">
            <label className="font-medium mb-1">{lang === "zh" ? "工种" : "工種"}</label>
            <div className="flex gap-4 flex-wrap">
              {jobOptions.map(j => (
                <label key={j} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={form.jobs.includes(j)}
                    onChange={() => {
                      setForm(prev => ({
                        ...prev,
                        jobs: prev.jobs.includes(j)
                          ? prev.jobs.filter(job => job !== j)
                          : [...prev.jobs, j]
                      }));
                    }}
                  />
                  {j}
                </label>
              ))}
            </div>
            {/* 工种其他输入框 */}
            {form.jobs.includes(lang === 'zh' ? '其他' : 'その他') && (
              <input className="border rounded px-3 py-2 mt-2" placeholder={lang === 'zh' ? '请输入其他工种' : 'その他の工種を入力'} value={jobOther} onChange={e => setJobOther(e.target.value)} />
            )}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "经验年数" : "経験年数"}</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                maxLength={2}
                className="border rounded px-3 py-2 w-20"
                value={form.expYear}
                onChange={e => handleInput('expYear', e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={lang === "zh" ? "年" : "年"}
              />
              <span>{lang === "zh" ? "年" : "年"}</span>
              <input
                type="text"
                maxLength={2}
                className="border rounded px-3 py-2 w-20"
                value={form.expMonth}
                onChange={e => handleInput('expMonth', e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={lang === "zh" ? "月" : "ヶ月"}
              />
              <span>{lang === "zh" ? "月" : "ヶ月"}</span>
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === 'zh' ? '劳灾保险到期' : '労災保険満了日'}</label>
            <input
              className={`border rounded px-3 py-2 w-full ${formErrors.insuranceDate ? 'border-red-500' : ''}`}
              type="text"
              value={form.insuranceDate}
              onChange={e => handleInput('insuranceDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              onBlur={e => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                if (raw.length === 8) {
                  const y = raw.slice(0, 4);
                  const m = raw.slice(4, 6);
                  const d = raw.slice(6, 8);
                  handleInput('insuranceDate', `${y}-${m}-${d}`);
                }
              }}
              placeholder={lang === 'zh' ? '例：20250101' : '例：20250101'}
              maxLength={8}
            />
            {formErrors.insuranceDate && <span className="text-red-500 text-sm mt-1">{formErrors.insuranceDate}</span>}
          </div>
          {/* 劳灾保险到期区间提示 */}
          <div className="text-xs text-gray-500 mt-1">{lang === 'zh' ? '有效区间' : '有効期間'}：{insuranceMinDisp} ~ {insuranceMaxDisp}</div>
        </div>

        {/* 住址信息 */}
        <div className="mb-8">
          <div className="flex flex-col">
            <label className="font-medium mb-1">{lang === "zh" ? "邮编" : "郵便番号"}</label>
            <input
              className={`border rounded px-3 py-2 ${zipError ? 'border-red-500' : ''}`}
              value={form.zip}
              onChange={e => handleInput('zip', e.target.value.replace(/[^0-9-]/g, ""))}
              maxLength={8}
              placeholder={lang === "zh" ? "例：123-4567" : "例：123-4567"}
            />
            {!validateZip(form.zip) && form.zip && <span className="text-red-500 text-sm mt-1">{lang === 'zh' ? '请输入7位数字邮编' : '7桁の郵便番号を入力してください'}</span>}
            {zipError && <span className="text-red-500 text-sm mt-1">{zipError}</span>}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "住址" : "住所"}</label>
            {autoAddress ? (
              <div className="px-3 py-2 bg-gray-100 dark:bg-neutral-700 rounded border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-gray-200">{autoAddress}</div>
            ) : (
              <>
                <input
                  className="border rounded px-3 py-2"
                  value={form.address}
                  onChange={e => handleInput('address', e.target.value)}
                  placeholder={lang === "zh" ? "市区町村" : "市区町村"}
                />
                <input
                  className="border rounded px-3 py-2 mt-2"
                  value={form.detailAddress}
                  onChange={e => handleInput('detailAddress', e.target.value)}
                  placeholder={lang === "zh" ? "详细地址" : "詳細住所"}
                />
              </>
            )}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "电话" : "電話番号"}</label>
            <input className={`border rounded px-3 py-2 ${formErrors.phone ? 'border-red-500' : ''}`} value={form.phone} onChange={e => handleInput('phone', e.target.value)} />
            {!validatePhone(form.phone) && form.phone && <span className="text-red-500 text-sm mt-1">{lang === 'zh' ? '请输入日本手机号格式，如090-1234-5678' : '090-1234-5678の形式で入力してください'}</span>}
            {formErrors.phone && <span className="text-red-500 text-sm mt-1">{formErrors.phone}</span>}
          </div>
        </div>

        {/* 健康信息 */}
        <div className="mb-8">
          {/* 健康诊断日 */}
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === 'zh' ? '健康诊断日' : '健康診断日'}</label>
            <input
              className={`border rounded px-3 py-2 w-full ${formErrors.healthDate ? 'border-red-500' : ''}`}
              type="text"
              value={form.healthDate}
              onChange={e => handleInput('healthDate', e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
              onBlur={e => {
                const raw = e.target.value.replace(/[^0-9]/g, "");
                if (raw.length === 8) {
                  const y = raw.slice(0, 4);
                  const m = raw.slice(4, 6);
                  const d = raw.slice(6, 8);
                  handleInput('healthDate', `${y}-${m}-${d}`);
                }
              }}
              placeholder={lang === 'zh' ? '例：20240101' : '例：20240101'}
              maxLength={8}
            />
            {formErrors.healthDate && <span className="text-red-500 text-sm mt-1">{formErrors.healthDate}</span>}
          </div>
          {/* 健康诊断日区间提示 */}
          <div className="text-xs text-gray-500 mt-1">{lang === 'zh' ? '有效区间' : '有効期間'}：{healthMinStr} ~ {healthMaxStr}</div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "血压" : "血圧"}</label>
            <div className="flex gap-2">
              <input
                className="border rounded px-3 py-2 w-1/2"
                placeholder={lang === "zh" ? "高压" : "収縮期"}
                value={form.bpHigh}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (!val) {
                    handleInput('bpHigh', '');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (num >= 80 && num <= 250) {
                    handleInput('bpHigh', val);
                  }
                }}
                maxLength={3}
              />
              <input
                className="border rounded px-3 py-2 w-1/2"
                placeholder={lang === "zh" ? "低压" : "拡張期"}
                value={form.bpLow}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  if (!val) {
                    handleInput('bpLow', '');
                    return;
                  }
                  const num = parseInt(val, 10);
                  if (num >= 40 && num <= 150) {
                    handleInput('bpLow', val);
                  }
                }}
                maxLength={3}
              />
            </div>
            {bpError && (
              <div className="mt-1 text-sm text-red-500">{bpError}</div>
            )}
            {!bpError && bpStatus && (
              <div className={`mt-1 text-sm ${bpStatusColor}`}>{bpStatus}</div>
            )}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "血型" : "血液型"}</label>
            <select
              className="border rounded px-3 py-2"
              value={form.blood}
              onChange={e => handleInput('blood', e.target.value)}
            >
              <option value="">{lang === "zh" ? "请选择" : "選択してください"}</option>
              {["A", "B", "AB", "O"].map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {/* 紧急联系人信息 */}
        <div className="mb-8">
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "紧急联系人姓名" : "緊急連絡先氏名"}</label>
              <input
                className={`border rounded px-3 py-2 ${formErrors.emgName ? 'border-red-500' : ''}`}
                value={form.emgName}
                onChange={e => handleInput('emgName', e.target.value)}
              />
              {formErrors.emgName && <span className="text-red-500 text-sm mt-1">{formErrors.emgName}</span>}
            </div>
            <div className="flex-1 flex flex-col">
              <label className="font-medium mb-1">{lang === "zh" ? "紧急联系人ふりがな" : "緊急連絡先ふりがな"}</label>
              <input
                className="border rounded px-3 py-2"
                value={form.emgFurigana}
                onChange={e => handleInput('emgFurigana', e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "紧急联系人电话" : "緊急連絡先電話番号"}</label>
            <input
              className={`border rounded px-3 py-2 ${formErrors.emgPhone ? 'border-red-500' : ''}`}
              value={form.emgPhone}
              onChange={e => handleInput('emgPhone', e.target.value)}
            />
            {!validatePhone(form.emgPhone) && form.emgPhone && <span className="text-red-500 text-sm mt-1">{lang === 'zh' ? '请输入日本手机号格式，如090-1234-5678' : '090-1234-5678の形式で入力してください'}</span>}
            {formErrors.emgPhone && <span className="text-red-500 text-sm mt-1">{formErrors.emgPhone}</span>}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "与本人关系" : "本人との関係"}</label>
            <select
              className={`border rounded px-3 py-2 ${formErrors.relationship ? 'border-red-500' : ''}`}
              value={form.relationship}
              onChange={e => handleInput('relationship', e.target.value)}
            >
              <option value="">{lang === "zh" ? "请选择" : "選択してください"}</option>
              <option value="配偶">{lang === "zh" ? "配偶" : "配偶者"}</option>
              <option value="父母">{lang === "zh" ? "父母" : "親"}</option>
              <option value="子女">{lang === "zh" ? "子女" : "子"}</option>
              <option value="其他">{lang === "zh" ? "其他" : "その他"}</option>
            </select>
            {form.relationship === "其他" && (
              <input
                className="border rounded px-3 py-2 mt-2"
                placeholder={lang === "zh" ? "请输入其他关系" : "その他の関係を入力"}
                value={form.relationshipOther}
                onChange={e => handleInput('relationshipOther', e.target.value)}
              />
            )}
            {formErrors.relationship && <span className="text-red-500 text-sm mt-1">{formErrors.relationship}</span>}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1 flex items-center gap-2">{lang === "zh" ? "紧急联系人邮编" : "緊急連絡先郵便番号"}
              <input type="checkbox" checked={form.emgSame} onChange={e => updateForm('emgSame', e.target.checked)} />
              <span className="text-xs">{lang === 'zh' ? '同上' : '同上'}</span>
            </label>
            <input
              className={`border rounded px-3 py-2 ${emgZipError ? 'border-red-500' : ''}`}
              value={form.emgZip}
              onChange={e => handleInput('emgZip', e.target.value.replace(/[^0-9-]/g, ""))}
              maxLength={8}
              placeholder={lang === "zh" ? "例：123-4567" : "例：123-4567"}
              readOnly={form.emgSame}
            />
            {!validateZip(form.emgZip) && form.emgZip && <span className="text-red-500 text-sm mt-1">{lang === 'zh' ? '请输入7位数字邮编' : '7桁の郵便番号を入力してください'}</span>}
            {emgZipError && <span className="text-red-500 text-sm mt-1">{emgZipError}</span>}
          </div>
          <div className="flex flex-col mt-4">
            <label className="font-medium mb-1">{lang === "zh" ? "紧急联系人住址" : "緊急連絡先住所"}</label>
            {emgAutoAddress ? (
              <div className="px-3 py-2 bg-gray-100 dark:bg-neutral-700 rounded border border-gray-200 dark:border-neutral-600 text-gray-700 dark:text-gray-200">{emgAutoAddress}</div>
            ) : (
              <>
                <input
                  className="border rounded px-3 py-2"
                  value={form.emgAddress}
                  onChange={e => handleInput('emgAddress', e.target.value)}
                  placeholder={lang === "zh" ? "市区町村" : "市区町村"}
                  readOnly={form.emgSame}
                />
                <input
                  className="border rounded px-3 py-2 mt-2"
                  value={form.emgDetailAddress}
                  onChange={e => handleInput('emgDetailAddress', e.target.value)}
                  placeholder={lang === "zh" ? "详细地址" : "詳細住所"}
                  readOnly={form.emgSame}
                />
              </>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <div className="flex justify-center mb-2">
          <button
            type="button"
            className="px-6 py-2 rounded bg-gray-300 text-gray-700 hover:bg-gray-400 mr-4"
            onClick={fillTestData}
          >
            填充测试数据
          </button>
        </div>
        <div className="mt-8 flex justify-center">
          <button
            type="submit"
            className="px-8 py-3 rounded-lg text-lg font-medium transition-colors bg-gradient-to-b from-[#bfc9d1] via-[#e6e8ea] to-[#7a7e83] border border-[#bfc9d1] hover:from-[#e6e8ea] hover:to-[#bfc9d1] active:from-[#7a7e83] active:to-[#bfc9d1] text-white shadow-md"
          >
            {lang === "zh" ? "下一步" : "次へ"}
          </button>
        </div>
      </form>

      {/* 确认信息弹窗 */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{lang === "zh" ? "请确认信息" : "情報を確認してください"}</h2>
            <div className="space-y-4">
              {/* 基本信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '基本信息' : '基本情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '姓名' : '氏名'}:</span> {form.firstName} {form.lastName}</div>
                  <div><span className="font-medium">{lang === 'zh' ? 'ふりがな' : 'ふりがな'}:</span> {form.firstNameFurigana} {form.lastNameFurigana}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '罗马字' : 'ローマ字'}:</span> {form.firstNameRomaji} {form.lastNameRomaji}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '性别' : '性別'}:</span> {form.gender}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '出生年月日' : '生年月日'}:</span> {form.birth}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '年龄' : '年齢'}:</span> {form.age}{lang === 'zh' ? '岁' : '歳'}</div>
                </div>
              </div>

              {/* 国籍信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '国籍信息' : '国籍情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '国籍' : '国籍'}:</span> {form.nationality}{form.nationality === '其他' && form.nationalityOther ? `（${form.nationalityOther}）` : ''}</div>
                  {form.nationality !== '日本' && (
                    <>
                      <div><span className="font-medium">{lang === 'zh' ? '在留资格' : '在留資格'}:</span> {form.visa}{form.visa === '其他' && form.visaOther ? `（${form.visaOther}）` : ''}</div>
                      <div><span className="font-medium">{lang === 'zh' ? '在留卡期限' : '在留カード期限'}:</span> {form.visaDate}</div>
                    </>
                  )}
                </div>
              </div>

              {/* 工作信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '工作信息' : '仕事情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '工种' : '工種'}:</span> {form.jobs.join(', ')}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '经验年数' : '経験年数'}:</span> {form.expYear}{lang === 'zh' ? '年' : '年'}{form.expMonth}{lang === 'zh' ? '月' : 'ヶ月'}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '劳灾保险到期' : '労災保険満了日'}:</span> {form.insuranceDate}</div>
                </div>
              </div>

              {/* 联系信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '联系信息' : '連絡情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '邮编' : '郵便番号'}:</span> {form.zip}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '住址' : '住所'}:</span> {form.address} {form.detailAddress}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '电话' : '電話番号'}:</span> {form.phone}</div>
                </div>
              </div>

              {/* 健康信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '健康信息' : '健康情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '健康诊断日' : '健康診断日'}:</span> {form.healthDate}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '血压' : '血圧'}:</span> {form.bpHigh}/{form.bpLow}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '血型' : '血液型'}:</span> {form.blood}</div>
                </div>
              </div>

              {/* 紧急联系人信息 */}
              <div className="border-b pb-2">
                <h3 className="font-bold mb-2">{lang === 'zh' ? '紧急联系人信息' : '緊急連絡先情報'}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="font-medium">{lang === 'zh' ? '姓名' : '氏名'}:</span> {form.emgName}</div>
                  <div><span className="font-medium">{lang === 'zh' ? 'ふりがな' : 'ふりがな'}:</span> {form.emgFurigana}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '关系' : '関係'}:</span> {form.relationship}{form.relationship === '其他' && form.relationshipOther ? `（${form.relationshipOther}）` : ''}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '电话' : '電話番号'}:</span> {form.emgPhone}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '邮编' : '郵便番号'}:</span> {form.emgZip}</div>
                  <div><span className="font-medium">{lang === 'zh' ? '住址' : '住所'}:</span> {form.emgAddress} {form.emgDetailAddress}</div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button className="px-8 py-3 rounded-lg text-lg font-medium transition-colors bg-gray-300 text-gray-500 hover:bg-gray-400" onClick={() => setShowConfirmModal(false)}>{lang === "zh" ? "返回修改" : "修正する"}</button>
              <button className="px-8 py-3 rounded-lg text-lg font-medium transition-colors bg-gradient-to-b from-[#bfc9d1] via-[#e6e8ea] to-[#7a7e83] border border-[#bfc9d1] hover:from-[#e6e8ea] hover:to-[#bfc9d1] active:from-[#7a7e83] active:to-[#bfc9d1] text-white shadow-md" onClick={handleConfirmSubmit}>{lang === "zh" ? "提交" : "登録する"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}