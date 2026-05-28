import { useState, useEffect } from 'react'

// ============ 场景配置 ============
const SCENARIOS = [
  {
    id: 'situation-report',
    name: '情况说明',
    icon: '📋',
    desc: '监管回复、情况说明、风险提示等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行监管要求和公文规范。你写的情况说明必须：1）符合银行公文格式标准；2）术语精准、用词严谨；3）逻辑清晰、数据准确；4）语气客观、不使用模糊表述。请直接输出正文内容，不要加标题重述。',
    fields: [
      { key: 'title', label: '事由', placeholder: '如：关于XX支行2025年一季度不良贷款率上升的情况说明', required: true, type: 'text' },
      { key: 'facts', label: '关键数据和事实', placeholder: '如：不良率从2.1%上升至2.8%，主要受XX行业影响...', required: true, type: 'textarea' },
      { key: 'recipient', label: '报送对象', placeholder: '如：分行风险管理部/监管科室', required: false, type: 'text' },
      { key: 'measures', label: '已采取/拟采取的措施', placeholder: '如：已加强贷后检查频次，拟调整XX行业授信政策', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份正式的情况说明：

【事由】${data.title}
${data.recipient ? `【报送对象】${data.recipient}` : ''}
【关键事实】${data.facts}
${data.measures ? `【应对措施】${data.measures}` : ''}

要求：
1. 标准公文格式（标题、主送、正文、落款）
2. 先概述事实，再分析原因，最后提出措施
3. 措辞严谨，不使用模糊表述
4. 字数800-1500字`
  },
  {
    id: 'risk-report',
    name: '风险分析报告',
    icon: '📊',
    desc: '信贷风险分析、行业风险研判等',
    systemPrompt: '你是一名商业银行风险分析专家，精通银行风险管理体系和监管要求。你写的风险分析报告必须：1）框架完整，涵盖概述、数据分析、风险识别、评估、建议；2）风险等级判断使用标准术语（低/中/高/较高）；3）数据引用准确，趋势判断有依据；4）建议措施具体可执行。请直接输出正文内容。',
    fields: [
      { key: 'reportType', label: '报告类型', placeholder: '如：信贷风险分析报告/行业风险分析报告', required: true, type: 'text' },
      { key: 'target', label: '分析对象', placeholder: '如：XX行业/XX支行信贷资产', required: true, type: 'text' },
      { key: 'period', label: '分析期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'indicators', label: '关键数据指标', placeholder: '如：不良率2.8%，拨备覆盖率150%，关注类贷款占比...', required: true, type: 'textarea' },
      { key: 'risks', label: '已知风险点', placeholder: '如：XX行业集中度偏高，担保链风险暴露', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份风险分析报告：

【报告类型】${data.reportType}
【分析对象】${data.target}
【分析期间】${data.period}
【关键数据指标】${data.indicators}
${data.risks ? `【已知风险点】${data.risks}` : ''}

要求：
1. 包含：概述、数据分析、风险识别、风险评估、建议措施
2. 风险等级判断使用标准术语
3. 建议措施具体可执行
4. 字数1500-2500字`
  },
  {
    id: 'work-summary',
    name: '工作总结',
    icon: '📝',
    desc: '工作总结、述职报告、汇报材料等',
    systemPrompt: '你是一名商业银行公文写作专家，精通银行各类总结汇报的规范和要求。你写的工作总结必须：1）成果部分用数据说话，避免空泛描述；2）不足部分客观诚恳，不回避问题；3）计划部分具体可衡量；4）符合银行内部汇报规范；5）语言正式但不刻板。请直接输出正文内容。',
    fields: [
      { key: 'docType', label: '文种', placeholder: '如：工作总结/述职报告/季度汇报', required: true, type: 'text' },
      { key: 'department', label: '汇报人/部门', placeholder: '如：风险管理部/XX支行', required: true, type: 'text' },
      { key: 'period', label: '汇报期间', placeholder: '如：2025年一季度', required: true, type: 'text' },
      { key: 'achievements', label: '主要工作成果', placeholder: '列出3-5项核心成果，尽量包含量化数据', required: true, type: 'textarea' },
      { key: 'issues', label: '存在的不足', placeholder: '如：不良率控制压力大，新发放贷款质量需关注', required: false, type: 'textarea' },
      { key: 'plans', label: '下一步计划', placeholder: '如：加强贷后管理、推进不良处置', required: false, type: 'textarea' },
    ],
    buildUserPrompt: (data) => `请根据以下信息撰写一份${data.docType}：

【文种】${data.docType}
【汇报人/部门】${data.department}
【汇报期间】${data.period}
【主要工作成果】${data.achievements}
${data.issues ? `【存在的不足】${data.issues}` : ''}
${data.plans ? `【下一步计划】${data.plans}` : ''}

要求：
1. 成果部分用数据说话，避免空泛描述
2. 不足部分客观诚恳
3. 计划部分具体可衡量
4. 符合银行内部汇报规范
5. 字数1000-2000字`
  },
]

// ============ API Key 组件 ============
function ApiKeySetup({ apiKey, onSave }) {
  const [key, setKey] = useState(apiKey)

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-2">设置 DeepSeek API Key</h3>
        <p className="text-sm text-gray-500 mb-4">
          本工具使用 DeepSeek AI 驱动。请前往
          <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-bank-600 underline mx-1">platform.deepseek.com</a>
          注册并获取 API Key（新用户有免费额度）。
        </p>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none mb-3"
        />
        <button
          onClick={() => key.trim() && onSave(key.trim())}
          disabled={!key.trim()}
          className="w-full bg-bank-600 hover:bg-bank-700 disabled:bg-gray-300 text-white font-semibold py-2.5 rounded-lg transition-colors"
        >
          保存并开始使用
        </button>
      </div>
    </div>
  )
}

// ============ 场景选择卡片 ============
function ScenarioCard({ scenario, onSelect }) {
  return (
    <button
      onClick={() => onSelect(scenario)}
      className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:border-bank-300 hover:shadow-lg transition-all text-left group"
    >
      <div className="text-3xl mb-3">{scenario.icon}</div>
      <h3 className="text-lg font-bold text-gray-900 group-hover:text-bank-600 transition-colors">{scenario.name}</h3>
      <p className="text-sm text-gray-500 mt-1">{scenario.desc}</p>
    </button>
  )
}

// ============ 表单组件 ============
function ScenarioForm({ scenario, onGenerate, onBack, loading }) {
  const [formData, setFormData] = useState(() => {
    const initial = {}
    scenario.fields.forEach(f => { initial[f.key] = '' })
    return initial
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onGenerate(formData)
  }

  const updateField = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <button onClick={onBack} className="text-bank-600 hover:text-bank-700 font-medium mb-4 flex items-center gap-1">
        ← 返回选择场景
      </button>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-2xl">{scenario.icon}</span>
        <h3 className="text-xl font-bold text-gray-900">{scenario.name}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {scenario.fields.map(field => (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                value={formData[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all resize-y"
              />
            ) : (
              <input
                type="text"
                value={formData[field.key]}
                onChange={(e) => updateField(field.key, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-bank-600 hover:bg-bank-700 disabled:bg-bank-400 text-white font-bold py-3 rounded-lg transition-colors text-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span> AI 正在生成...
            </span>
          ) : '生成底稿'}
        </button>
      </form>
    </div>
  )
}

// ============ 结果展示组件 ============
function ResultView({ content, onReset, scenario }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{scenario.icon}</span>
          <h3 className="text-lg font-bold text-gray-900">{scenario.name} - 生成结果</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="bg-bank-100 hover:bg-bank-200 text-bank-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            {copied ? '✅ 已复制' : '📋 复制全文'}
          </button>
          <button
            onClick={onReset}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
          >
            重新生成
          </button>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 border border-gray-200 max-h-[60vh] overflow-y-auto">
        {content}
      </div>
      <p className="text-xs text-gray-400 mt-3 text-center">
        ⚠️ 以上内容由AI生成，请结合实际情况修改后使用
      </p>
    </div>
  )
}

// ============ 主工具页面 ============
export default function ToolPage() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('deepseek_api_key') || '')
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 保存 API Key
  const handleSaveApiKey = (key) => {
    setApiKey(key)
    localStorage.setItem('deepseek_api_key', key)
  }

  // 调用 DeepSeek API
  const handleGenerate = async (formData) => {
    if (!apiKey) {
      setError('请先设置 API Key')
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const userPrompt = selectedScenario.buildUserPrompt(formData)

      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: selectedScenario.systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        if (response.status === 401) {
          throw new Error('API Key 无效，请检查后重新设置')
        } else if (response.status === 429) {
          throw new Error('请求过于频繁，请稍后再试')
        } else {
          throw new Error(errData.error?.message || `请求失败 (${response.status})`)
        }
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        throw new Error('AI 未返回有效内容')
      }

      setResult(content)
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('网络连接失败，请检查网络后重试')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // 重新生成
  const handleReset = () => {
    setResult('')
    setSelectedScenario(null)
    setError('')
  }

  // 没 API Key → 显示设置页
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-bank-600 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3">🏦</div>
            <h1 className="text-2xl font-black text-gray-900">银行人AI工具包</h1>
            <p className="text-gray-500 mt-1">首次使用需设置 API Key</p>
          </div>
          <ApiKeySetup apiKey={apiKey} onSave={handleSaveApiKey} />
        </div>
      </div>
    )
  }

  // 有结果 → 显示结果
  if (result && selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-3xl mx-auto">
          <ResultView content={result} onReset={handleReset} scenario={selectedScenario} />
        </div>
      </div>
    )
  }

  // 选了场景 → 显示表单
  if (selectedScenario) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 pt-20">
        <div className="max-w-xl mx-auto">
          <ScenarioForm
            scenario={selectedScenario}
            onGenerate={handleGenerate}
            onBack={() => { setSelectedScenario(null); setError('') }}
            loading={loading}
          />
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
              ❌ {error}
              {error.includes('API Key') && (
                <button
                  onClick={() => { setApiKey(''); localStorage.removeItem('deepseek_api_key') }}
                  className="ml-2 underline text-red-600"
                >
                  重新设置
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 默认 → 显示场景选择
  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-20">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">选择你要写的材料</h1>
          <p className="text-gray-500 mt-2">3分钟出银行味底稿，复制就能交</p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {SCENARIOS.map(s => (
            <ScenarioCard key={s.id} scenario={s} onSelect={setSelectedScenario} />
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setApiKey(''); localStorage.removeItem('deepseek_api_key') }}
            className="text-gray-400 hover:text-gray-600 text-sm transition-colors"
          >
            重新设置 API Key
          </button>
        </div>
      </div>
    </div>
  )
}
