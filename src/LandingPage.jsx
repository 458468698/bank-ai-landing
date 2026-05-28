import { useState } from 'react'
import { Link } from 'react-router-dom'

function LandingPage() {
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', wechat: '', position: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('内测预约提交:', formData)
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen">
      {/* ========== 导航栏 ========== */}
      <nav className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-bank-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">银</div>
            <span className="font-bold text-gray-900 text-lg">银行人AI工具包</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/tool"
              className="text-bank-600 hover:text-bank-700 font-medium text-sm transition-colors"
            >
              免费体验 →
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="bg-bank-600 hover:bg-bank-700 text-white font-semibold py-2 px-5 rounded-lg text-sm transition-colors"
            >
              立即购买 ¥49
            </button>
          </div>
        </div>
      </nav>

      {/* ========== 一、首屏 Hero ========== */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24 bg-gradient-to-br from-bank-50 via-white to-blue-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <span className="bg-bank-100 text-bank-700 text-sm font-medium px-3 py-1 rounded-full">写总结</span>
              <span className="bg-bank-100 text-bank-700 text-sm font-medium px-3 py-1 rounded-full">写情况说明</span>
              <span className="bg-bank-100 text-bank-700 text-sm font-medium px-3 py-1 rounded-full">写信贷报告</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-gray-900 leading-tight mb-6">
              不用改就能交的<br />
              <span className="text-bank-600">银行材料</span>
            </h1>

            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              专为商业银行人打造的AI写作工具。3分钟生成术语精准、格式规范、语气到位的银行材料，49元一次买断。
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Link
                to="/tool"
                className="btn-primary text-xl px-10 py-4"
              >
                免费体验 →
              </Link>
              <button
                onClick={() => setShowModal(true)}
                className="btn-secondary"
              >
                立即购买 ¥49
              </button>
            </div>

            <p className="text-gray-400 text-sm">
              已有银行同行在内测中 · 一次买断 · 无隐藏费用
            </p>
          </div>
        </div>
      </section>

      {/* ========== 二、对比展示区 ========== */}
      <section id="demo" className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">通用AI vs 银行专用AI</h2>
            <p className="text-gray-500 text-lg">3秒钟看出差距</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="card border-2 border-red-100 relative">
              <div className="absolute -top-3 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">通用AI输出</div>
              <div className="bg-gray-50 rounded-xl p-5 mt-2 font-mono text-sm leading-relaxed">
                <p className="text-gray-400 text-xs mb-3">📝 生成的工作总结：</p>
                <div className="text-gray-700 space-y-2">
                  <p>本季度工作完成情况如下：</p>
                  <p>一、存款业务方面，存款金额增加了不少，比上季度有所增长。</p>
                  <p>二、贷款业务方面，贷款也有所增长，不良率控制在合理范围内。</p>
                  <p>三、其他工作，完成了领导交办的各项任务。</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-red-500">
                  <span>❌</span>
                  <span className="text-xs">术语模糊 · 格式随意 · 像学生作文</span>
                </div>
              </div>
            </div>

            <div className="card border-2 border-green-100 relative shadow-xl">
              <div className="absolute -top-3 left-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">银行专用AI输出</div>
              <div className="bg-bank-50 rounded-xl p-5 mt-2 font-mono text-sm leading-relaxed">
                <p className="text-bank-400 text-xs mb-3">📝 生成的工作总结：</p>
                <div className="text-gray-700 space-y-2">
                  <p>本季度，我行在公司业务条线紧紧围绕总行党委决策部署，坚持稳中求进工作总基调，各项业务保持平稳运行。</p>
                  <p>一、存款业务：截至季末，各项存款余额XX万元，较年初增加XX万元，增幅XX%，完成全年计划的XX%。</p>
                  <p>二、信贷投放：按照"控总量、调结构、优投向"原则，各项贷款余额XX万元，较年初增加XX万元。</p>
                </div>
                <div className="mt-4 flex items-center gap-2 text-green-600">
                  <span>✅</span>
                  <span className="text-xs">术语精准 · 格式规范 · 领导看了直点头</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link to="/tool" className="btn-primary">
              免费体验这个效果 →
            </Link>
          </div>
        </div>
      </section>

      {/* ========== 三、痛点共鸣区 ========== */}
      <section className="py-16 md:py-24 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">这些场景，你一定不陌生</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '😫', title: '又加班写材料了', desc: '周五下午5点领导说"写个总结周一交"，整个周末泡汤' },
              { icon: '😤', title: '通用AI写的不是银行话', desc: 'ChatGPT写出来的像学生作文，术语不对、格式不对、领导一看就打回' },
              { icon: '😰', title: '情况说明不会写', desc: '监管要的情况说明，格式要求严格，写不好就是合规风险' },
              { icon: '🤯', title: '信贷报告改了三遍', desc: '审贷会前夜还在改报告，术语对不上、逻辑不顺、数据对不上' },
              { icon: '😩', title: '月报季报年年写', desc: '每次都是复制去年改改，但还是要花半天时间调整格式和数据' },
              { icon: '🙄', title: '给领导的材料被退回', desc: '"这个不像我们行写的"，改了又改，还是过不了' },
            ].map((item, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <p className="text-xl md:text-2xl font-semibold text-bank-300 mb-6">
              这些痛点，3分钟就能解决
            </p>
            <Link to="/tool" className="btn-primary">
              立即免费体验 →
            </Link>
          </div>
        </div>
      </section>

      {/* ========== 四、3步操作介绍 ========== */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">3步出银行味底稿</h2>
            <p className="text-gray-500 text-lg">不需要学AI，不需要写提示词，选完就能用</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: '选场景', desc: '写总结？写情况说明？写信贷报告？一键选择你要的场景', icon: '📋' },
              { step: '2', title: '填要点', desc: '按提示填入关键信息：数据、要点、行名……不用写提示词', icon: '✏️' },
              { step: '3', title: '一键出底稿', desc: '3秒生成银行味材料，术语精准、格式规范，复制就能交', icon: '✅' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-bank-100 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">
                  {item.icon}
                </div>
                <div className="inline-block bg-bank-600 text-white text-sm font-bold px-3 py-1 rounded-full mb-3">
                  第{item.step}步
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/tool" className="btn-primary">
              开始体验 · 免费 →
            </Link>
          </div>
        </div>
      </section>

      {/* ========== 五、价格 + 底部CTA ========== */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-bank-600 to-bank-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-6">49元一次买断</h2>
          <p className="text-xl text-bank-100 mb-2">无隐藏费用 · 无订阅 · 无后续扣款</p>
          <p className="text-bank-200 mb-8">3个核心场景全开放 · 永久使用 · 后续场景包免费更新</p>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 md:p-8 mb-8 max-w-lg mx-auto">
            <div className="text-left space-y-3">
              {[
                '✅ 写工作总结 / 周报 / 月报 / 季报',
                '✅ 写情况说明 / 监管回复',
                '✅ 写信贷报告 / 审贷材料',
                '✅ 银行术语精准、格式规范',
                '✅ 一次买断，永久使用',
                '✅ 后续场景包免费更新',
              ].map((item, i) => (
                <p key={i} className="text-white/90">{item}</p>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/tool"
              className="bg-white text-bank-700 font-bold py-4 px-10 rounded-xl text-xl hover:bg-gray-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
            >
              免费体验 →
            </Link>
            <button
              onClick={() => setShowModal(true)}
              className="border-2 border-white/40 text-white font-bold py-4 px-10 rounded-xl text-xl hover:bg-white/10 transition-all"
            >
              立即购买 ¥49
            </button>
          </div>

          <p className="text-bank-200 text-sm mt-4">早鸟价 ¥49 · 恢复原价 ¥99</p>
        </div>
      </section>

      {/* ========== 页脚 ========== */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>银行人AI工具包 · 仅供银行从业人员使用</p>
        <p className="mt-1">仅供参考，不构成任何投资建议</p>
      </footer>

      {/* ========== 假门弹窗：内测预约 ========== */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            {!submitted ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-14 h-14 bg-bank-100 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-gray-900">内测预约</h3>
                  <p className="text-gray-500 mt-2">产品即将上线，留下信息第一时间获取内测资格</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
                    <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all" placeholder="怎么称呼你" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">微信号</label>
                    <input type="text" required className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all" placeholder="方便我们联系你" value={formData.wechat} onChange={(e) => setFormData({ ...formData, wechat: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
                    <input type="text" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-bank-500 focus:border-bank-500 outline-none transition-all" placeholder="如：对公客户经理、风控专员" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <button type="submit" className="btn-primary w-full mt-2">提交预约</button>
                </form>
                <p className="text-center text-gray-400 text-xs mt-4">内测名额有限，我们将按顺序联系您</p>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">预约成功！</h3>
                <p className="text-gray-500">我们将在产品上线后第一时间联系您</p>
                <button onClick={() => { setShowModal(false); setSubmitted(false); setFormData({ name: '', wechat: '', position: '' }) }} className="mt-6 text-bank-600 font-medium hover:text-bank-700 transition-colors">关闭</button>
              </div>
            )}
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default LandingPage
