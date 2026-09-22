<template>
  <div class="staff-page">
    <!-- 顶部：蓝色渐变 -->
    <header class="staff-header">
      <div class="hd-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="hd-title">
          <span class="hd-kicker">MEDICAL STAFF SERVICE</span>
          <h1>医疗信息查询</h1>
        </div>
      </div>
      <div class="hd-right">
        <span class="hd-sub">浦东新区医院 · 医生信息 · 出诊排班 · 在线预约</span>
        <template v-if="account">
          <span class="usr-chip">{{ account.real_name || account.phone }} · {{ isDoctor ? '医生' : '患者' }}</span>
          <button class="hd-btn" @click="logout">退出登录</button>
        </template>
        <template v-else>
          <button class="hd-btn" @click="openAuth('login')">登录</button>
          <button class="hd-btn primary" @click="openAuth('register')">注册账号</button>
        </template>
      </div>
    </header>

    <!-- 功能标签页 -->
    <nav class="tab-bar">
      <button :class="{ active: view === 'query' }" @click="switchView('query')">🔍 医生查询</button>
      <button :class="{ active: view === 'schedule' }" @click="switchView('schedule')">🗓 医院排班</button>
      <button :class="{ active: view === 'mine' }" @click="switchView('mine')">📋 我的预约</button>
      <button class="tri-entry" @click="$router.push('/smart-triage')">🧭 智慧导诊</button>
      <button v-if="isDoctor" :class="{ active: view === 'doctor' }" @click="switchView('doctor')">👨‍⚕️ 医生工作台</button>
    </nav>

    <!-- ===== 医生查询 ===== -->
    <section class="view-body" v-if="view === 'query'">
      <div class="filter-bar">
        <input
          v-model="filters.keyword"
          class="search-input"
          placeholder="输入姓名 / 科室 / 擅长方向 / 医院"
          @keyup.enter="searchDoctors"
        />
        <select v-model="filters.hospitalId" class="select-box">
          <option value="">全部医院</option>
          <option v-for="h in hospitals" :key="h.value" :value="h.value">{{ h.label }}</option>
        </select>
        <select v-model="filters.department" class="select-box">
          <option value="">全部科室</option>
          <option v-for="d in departments" :key="d.value" :value="d.value">{{ d.label }}</option>
        </select>
        <button class="btn-primary" @click="searchDoctors">查询</button>
        <button class="btn-ghost" @click="resetFilters">重置</button>
      </div>

      <div class="doctor-count" v-if="!loading">共找到 <b>{{ doctorList.length }}</b> 位医生</div>

      <div class="card-grid">
        <div class="doc-card" v-for="d in doctorList" :key="d.id">
          <div class="doc-head">
            <div class="avatar" :style="{ background: avatarColor(d.name) }">{{ d.name.charAt(0) }}</div>
            <div class="doc-name">
              <h3>{{ d.name }} <span class="gender">{{ d.gender }}</span></h3>
              <span class="title-tag" :class="titleClass(d.title)">{{ d.title }}</span>
            </div>
          </div>
          <div class="doc-line"><span class="lbl">科室</span>{{ d.department }}</div>
          <div class="doc-line"><span class="lbl">医院</span>{{ d.hospital_name }}</div>
          <div class="doc-line"><span class="lbl">出诊</span>{{ d.out_time }}</div>
          <div class="tag-row">
            <span
              v-for="s in splitSpec(d.specialty)"
              :key="s"
              class="spec-tag"
            >{{ s }}</span>
          </div>
          <div class="doc-actions">
            <button class="btn-ghost sm" @click="openDetail(d)">查看详情</button>
            <button class="btn-warm sm" @click="startAppoint(d)">预约</button>
          </div>
        </div>
      </div>

      <div class="empty" v-if="!loading && doctorList.length === 0">未找到相关医生，请调整筛选条件</div>
    </section>

    <!-- ===== 医院排班 ===== -->
    <section class="view-body" v-else-if="view === 'schedule'">
      <div class="schedule-layout">
        <div class="schedule-main">
          <div class="filter-bar">
            <select v-model="scheduleHospitalId" class="select-box wide" @change="loadSchedule">
              <option value="">请选择医院</option>
              <option v-for="h in hospitals" :key="h.value" :value="h.value">{{ h.label }}</option>
            </select>
          </div>

          <div class="schedule-card" v-if="scheduleHospitalId">
            <h3 class="sc-title">出诊排班（{{ scheduleHospitalName }}）</h3>
            <table class="sc-table">
              <thead>
                <tr><th>姓名</th><th>性别</th><th>科室</th><th>职称</th><th>出诊时间</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in scheduleList" :key="s.id">
                  <td><b>{{ s.name }}</b></td>
                  <td>{{ s.gender }}</td>
                  <td>{{ s.department }}</td>
                  <td><span class="title-tag" :class="titleClass(s.title)">{{ s.title }}</span></td>
                  <td>{{ s.out_time }}</td>
                </tr>
              </tbody>
            </table>
            <div class="empty" v-if="scheduleList.length === 0">该医院暂无排班信息</div>
          </div>
          <div class="empty" v-else>请在上方选择一家医院查看其出诊排班</div>
        </div>

        <aside class="schedule-aside">
          <div class="sa-card">
            <div class="sa-card-title">排班说明</div>
            <ul class="sa-tip-list">
              <li>出诊时间以实际为准，建议提前预约</li>
              <li>"上午"指 08:30-11:30</li>
              <li>"下午"指 13:30-16:30</li>
              <li>"全天"指 08:00-16:30</li>
              <li>如遇医生临时停诊，系统将自动通知</li>
            </ul>
          </div>
          <div class="sa-card sa-stats">
            <div class="sa-card-title">排班概览</div>
            <div class="sa-overview">
              <div class="sa-ov-item">
                <div class="sa-ov-num">{{ scheduleList.length }}</div>
                <div class="sa-ov-lbl">出诊医生</div>
              </div>
              <div class="sa-ov-item">
                <div class="sa-ov-num">{{ scheduleDepts.length }}</div>
                <div class="sa-ov-lbl">覆盖科室</div>
              </div>
              <div class="sa-ov-item">
                <div class="sa-ov-num">{{ scheduleMorning }}</div>
                <div class="sa-ov-lbl">上午出诊</div>
              </div>
              <div class="sa-ov-item">
                <div class="sa-ov-num">{{ scheduleAfternoon }}</div>
                <div class="sa-ov-lbl">下午出诊</div>
              </div>
            </div>
            <div class="sa-dept-chart" v-if="scheduleDepts.length">
              <div class="sa-dept-bar" v-for="d in scheduleDeptChart" :key="d.name">
                <span class="sa-dept-name">{{ d.name }}</span>
                <div class="sa-dept-track"><div class="sa-dept-fill" :style="{ width: d.pct + '%' }"></div></div>
                <span class="sa-dept-count">{{ d.count }}</span>
              </div>
            </div>
          </div>
          <div class="sa-card sa-quote">
            <div class="sa-quote-icon">💬</div>
            <p>合理安排就诊时间，错峰就诊可减少等候。建议优先选择上午较早或下午较晚时段。</p>
          </div>
        </aside>
      </div>
    </section>

    <!-- ===== 我的预约 ===== -->
    <section class="view-body mine-view" v-else-if="view === 'mine'">
      <!-- 顶部横排信息卡 -->
      <div class="mine-banner">
        <div class="mb-left">
          <div class="mb-icon">📋</div>
          <div class="mb-text">
            <div class="mb-title">我的预约中心</div>
            <div class="mb-sub">管理您的就诊安排 · 查看预约状态 · 编辑或取消预约</div>
          </div>
        </div>
        <div class="mb-stats">
          <div class="mb-stat">
            <div class="mb-stat-num">{{ appointmentList.length }}</div>
            <div class="mb-stat-lbl">总预约</div>
          </div>
          <div class="mb-stat">
            <div class="mb-stat-num">{{ appointmentList.filter(a => a.status === '已预约' || a.status === '已同意').length }}</div>
            <div class="mb-stat-lbl">有效预约</div>
          </div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="filter-bar">
        <input
          v-model="minePhone"
          class="search-input"
          placeholder="输入预留手机号查询我的预约"
          @keyup.enter="loadMine"
        />
        <button class="btn-primary" @click="loadMine">查询</button>
      </div>

      <!-- 预约卡片列表 -->
      <div class="appt-list" v-if="appointmentList.length">
        <div class="appt-card" v-for="a in appointmentList" :key="a.id">
          <div class="appt-main">
            <div class="appt-card-head">
              <h3>{{ a.doctor_name }} <span class="muted">/ {{ a.department }}</span></h3>
              <span class="status-tag" :class="statusClass(a.status)">{{ a.status }}</span>
            </div>
            <div class="appt-info-grid">
              <div class="appt-info-item"><span class="ai-icon">🏥</span><span>{{ a.hospital_name }}</span></div>
              <div class="appt-info-item"><span class="ai-icon">📅</span><span>{{ a.appoint_date }} · {{ a.time_slot }}</span></div>
              <div class="appt-info-item"><span class="ai-icon">👤</span><span>{{ a.patient_name }}（{{ a.patient_gender || '-' }} / {{ a.patient_age || '-' }}岁）</span></div>
              <div class="appt-info-item"><span class="ai-icon">📞</span><span>{{ a.patient_phone }}</span></div>
            </div>
            <div class="appt-line" v-if="a.remark">📝 备注：{{ a.remark }}</div>
            <div class="appt-msg" v-if="a.doctor_msg">💬 医生留言：{{ a.doctor_msg }}</div>
          </div>
          <div class="appt-actions-h" v-if="account && account.phone === a.patient_phone">
            <button class="btn-ghost sm" @click="openEdit(a)">✏ 编辑</button>
            <button class="btn-danger sm" @click="askDeleteAppt(a)">🗑 删除</button>
          </div>
          <div class="appt-actions-h" v-else>
            <span class="appt-lock-tip">🔒 仅预约者本人可编辑/删除</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="mine-empty" v-else-if="minePhone && mineQueried">
        <div class="me-icon">📭</div>
        <p>未查询到该手机号对应的预约记录</p>
      </div>
      <div class="mine-empty" v-else>
        <div class="me-icon">📋</div>
        <p>输入手机号查询自己的预约，可进行编辑与删除</p>
      </div>

      <!-- 底部提示条 -->
      <div class="mine-tips-bar" v-if="appointmentList.length">
        <div class="mtb-item"><span class="mtb-icon">💡</span> 就诊前请整理好既往病史和用药情况</div>
        <div class="mtb-item"><span class="mtb-icon">⏰</span> 建议提前15分钟到院取号</div>
        <div class="mtb-item"><span class="mtb-icon">🆔</span> 就诊时请携带身份证或医保卡</div>
        <div class="mtb-item"><span class="mtb-icon">💊</span> 如有检查报告请一并携带</div>
      </div>
    </section>

    <!-- ===== 预约表单 ===== -->
    <section class="view-body" v-else-if="view === 'appoint'">
      <div class="appoint-layout">
        <div class="appoint-box">
          <h3 class="ap-title">预约挂号</h3>
          <div class="ap-doctor" v-if="appointDoctor">
            <div class="avatar lg" :style="{ background: avatarColor(appointDoctor.name) }">{{ appointDoctor.name.charAt(0) }}</div>
            <div>
              <div class="ap-doc-name">{{ appointDoctor.name }} · {{ appointDoctor.title }}</div>
              <div class="ap-doc-sub">{{ appointDoctor.hospital_name }} · {{ appointDoctor.department }}</div>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-item">
              <label>姓名 <i>*</i></label>
              <input v-model="appointForm.patient_name" placeholder="患者姓名" />
            </div>
            <div class="form-item">
              <label>性别</label>
              <select v-model="appointForm.patient_gender">
                <option value="">请选择</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
            <div class="form-item">
              <label>年龄</label>
              <input v-model="appointForm.patient_age" type="number" placeholder="年龄" />
            </div>
            <div class="form-item">
              <label>手机号 <i>*</i></label>
              <input v-model="appointForm.patient_phone" placeholder="预留手机号" />
            </div>
            <div class="form-item">
              <label>预约日期 <i>*</i></label>
              <input v-model="appointForm.appoint_date" type="date" :min="today" />
            </div>
            <div class="form-item">
              <label>时间段 <i>*</i></label>
              <select v-model="appointForm.time_slot">
                <option value="">请选择</option>
                <option v-for="s in availableTimeSlots" :key="s" :value="s">{{ s }}</option>
              </select>
              <span class="slot-hint busy" v-if="appointForm.appoint_date === today && availableTimeSlots.length === 0">
                今天已没有可预约的时间段，请选择其他日期
              </span>
              <span class="slot-hint" :class="slotStatus" v-if="slotStatus !== 'idle'">
                <template v-if="slotStatus === 'checking'">⏳ 正在查询名额…</template>
                <template v-else-if="slotStatus === 'busy'">⚠ 该时段已约满，请更换时间段</template>
                <template v-else>✓ 该时段可预约（已约 {{ slotBooked }}/{{ slotQuota }}，剩余 {{ slotRemaining }} 个名额）</template>
              </span>
            </div>
            <div class="form-item full">
              <label>备注</label>
              <input v-model="appointForm.remark" placeholder="就诊需求、病史等（选填）" />
            </div>
          </div>

          <div class="ap-actions">
            <button class="btn-ghost ap-btn" @click="view = 'query'">返回</button>
            <button class="btn-primary ap-btn" @click="submitAppoint">提交预约</button>
          </div>
        </div>

        <!-- 预约须知侧栏 -->
        <aside class="appoint-aside">
          <div class="aa-card aa-doctor-card" v-if="appointDoctor">
            <div class="aa-card-title">医生信息</div>
            <div class="aa-doc-row"><span class="aa-lbl">姓名</span><b>{{ appointDoctor.name }}</b></div>
            <div class="aa-doc-row"><span class="aa-lbl">职称</span>{{ appointDoctor.title }}</div>
            <div class="aa-doc-row"><span class="aa-lbl">科室</span>{{ appointDoctor.department }}</div>
            <div class="aa-doc-row"><span class="aa-lbl">医院</span>{{ appointDoctor.hospital_name }}</div>
            <div class="aa-doc-row"><span class="aa-lbl">出诊</span>{{ appointDoctor.out_time }}</div>
            <div class="aa-doc-spec" v-if="appointDoctor.specialty">
              <span v-for="s in splitSpec(appointDoctor.specialty)" :key="s" class="spec-tag">{{ s }}</span>
            </div>
          </div>

          <div class="aa-card">
            <div class="aa-card-title">预约时段</div>
            <div class="aa-slot-item" v-for="s in timeSlots" :key="s">
              <span class="aa-slot-dot" :class="{ on: appointForm.time_slot === s }"></span>
              <span class="aa-slot-text">{{ s }}</span>
            </div>
          </div>

          <div class="aa-card aa-tips">
            <div class="aa-card-title">预约须知</div>
            <ul class="aa-tip-list">
              <li>请如实填写患者信息，手机号将用于接收预约通知</li>
              <li>每个时段名额有限，约满后需更换时间段</li>
              <li>请按预约时间段提前 15 分钟到院取号</li>
              <li>如需取消预约，请在「我的预约」中操作</li>
              <li>就诊当天请携带本人身份证 / 医保卡</li>
            </ul>
          </div>
        </aside>
      </div>
    </section>

    <!-- ===== 医生工作台 ===== -->
    <section class="view-body" v-else-if="view === 'doctor'">
      <div class="doctor-panel">
        <div class="dp-head">
          <h2>👨‍⚕️ 医生工作台</h2>
          <span class="muted">您好，{{ account.real_name || account.phone }} 医生</span>
        </div>

        <!-- 额度设置 -->
        <div class="quota-card">
          <h3 class="sc-title">每日每时段预约额度设置</h3>
          <p class="quota-tip">以下额度为每个时段每天最多可接受的预约人数，修改后点击「保存额度设置」即时生效。</p>
          <div class="quota-grid">
            <div class="quota-item" v-for="c in slotConfigs" :key="c.slot">
              <span class="quota-slot">{{ c.slot }}</span>
              <div class="quota-ctrl">
                <button class="q-btn" @click="changeQuota(c, -1)">−</button>
                <input type="number" min="0" v-model.number="c.quota" />
                <button class="q-btn" @click="changeQuota(c, 1)">＋</button>
                <span class="quota-unit">人/天</span>
              </div>
            </div>
          </div>
          <div class="dp-actions">
            <button class="btn-primary" @click="saveSlotConfig">保存额度设置</button>
          </div>
        </div>

        <!-- 预约我的患者 -->
        <div class="quota-card">
          <div class="dp-sub-head">
            <h3 class="sc-title">预约我的患者</h3>
            <button class="btn-ghost sm" @click="loadDoctorAppointments">刷新列表</button>
          </div>
          <div class="appt-list" v-if="doctorAppointments.length">
            <div class="appt-card doc-appt" v-for="a in doctorAppointments" :key="a.id">
              <div class="appt-main">
                <h3>{{ a.patient_name }} <span class="muted">/ {{ a.patient_gender || '-' }} {{ a.patient_age ? a.patient_age + '岁' : '' }}</span></h3>
                <div class="appt-line">📅 {{ a.appoint_date }} · {{ a.time_slot }}</div>
                <div class="appt-line">📞 {{ a.patient_phone }}</div>
                <div class="appt-line" v-if="a.remark">备注：{{ a.remark }}</div>
                <span class="status-tag">{{ a.status }}</span>
                <div class="doc-appt-actions">
                  <button class="btn-confirm-appt" v-if="!a.doctor_msg || a.doctor_msg.indexOf('请及时就医') === -1" @click="confirmAppointment(a)">✓ 确认就诊</button>
                </div>
              </div>
              <div class="appt-right">
                <div class="msg-box">
                  <label class="msg-label">给患者留言</label>
                  <textarea rows="2" v-model="msgDrafts[a.id]" placeholder=""></textarea>
                  <div class="msg-actions">
                    <button class="btn-ghost sm" @click="saveDoctorMsg(a)">保存留言</button>
                    <button class="btn-danger sm" v-if="a.doctor_msg" @click="deleteDoctorMsg(a)">删除留言</button>
                  </div>
                  <div class="msg-saved" v-if="a.doctor_msg">已留言：{{ a.doctor_msg }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="empty" v-else>暂无患者预约您</div>
        </div>
      </div>
    </section>

    <!-- ===== 医生详情弹窗 ===== -->
    <div class="modal-mask" v-if="detailShow" @click.self="detailShow = false">
      <div class="detail-modal">
        <div class="dm-head">
          <img v-if="detailDoctor.photo" class="avatar-photo" :src="detailDoctor.photo" alt="医生照片" />
          <div v-else class="avatar lg" :style="{ background: avatarColor(detailDoctor.name) }">{{ detailDoctor.name.charAt(0) }}</div>
          <div class="dm-title">
            <h3>{{ detailDoctor.name }} <span class="gender">{{ detailDoctor.gender }}</span></h3>
            <span class="title-tag" :class="titleClass(detailDoctor.title)">{{ detailDoctor.title }}</span>
          </div>
          <button class="dm-close" @click="detailShow = false">×</button>
        </div>
        <div class="dm-info">
          <div class="dm-row"><b>科室</b><span>{{ detailDoctor.department }}</span></div>
          <div class="dm-row"><b>医院</b><span>{{ detailDoctor.hospital_name }}</span></div>
          <div class="dm-row"><b>出诊时间</b><span>{{ detailDoctor.out_time }}</span></div>
          <div class="dm-row"><b>擅长方向</b><span>{{ detailDoctor.specialty }}</span></div>
        </div>
        <div class="dm-calendar">
          <h4>出诊日历</h4>
          <div class="cal-grid">
            <div class="cal-cell" v-for="w in calendar.weekOrder" :key="w" :class="{ on: calendar.map[w].length > 0 }">
              <div class="cal-day">{{ w }}</div>
              <div class="cal-slots">{{ calendar.map[w].length ? calendar.map[w].join(' · ') : '休' }}</div>
            </div>
          </div>
        </div>
        <div class="dm-intro">
          <h4>详细介绍</h4>
          <p>{{ detailDoctor.intro }}</p>
        </div>
        <div class="dm-actions">
          <button class="btn-warm" @click="startAppoint(detailDoctor)">预约挂号</button>
        </div>
      </div>
    </div>

    <!-- ===== 编辑预约弹窗 ===== -->
    <div class="modal-mask" v-if="editShow" @click.self="editShow = false">
      <div class="edit-modal">
        <h3 class="em-title">编辑预约</h3>
        <div class="form-grid">
          <div class="form-item">
            <label>姓名 <i>*</i></label>
            <input v-model="editForm.patient_name" />
          </div>
          <div class="form-item">
            <label>性别</label>
            <select v-model="editForm.patient_gender">
              <option value="">请选择</option>
              <option value="男">男</option>
              <option value="女">女</option>
            </select>
          </div>
          <div class="form-item">
            <label>年龄</label>
            <input v-model="editForm.patient_age" type="number" />
          </div>
          <div class="form-item">
            <label>手机号 <i>*</i></label>
            <input v-model="editForm.patient_phone" />
          </div>
          <div class="form-item">
            <label>预约日期 <i>*</i></label>
            <input v-model="editForm.appoint_date" type="date" :min="today" />
          </div>
          <div class="form-item">
            <label>时间段 <i>*</i></label>
            <select v-model="editForm.time_slot">
              <option value="">请选择</option>
              <option v-for="s in editableTimeSlots" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div class="form-item full">
            <label>备注</label>
            <input v-model="editForm.remark" />
          </div>
        </div>
        <div class="em-actions">
          <button class="btn-ghost" @click="editShow = false">取消</button>
          <button class="btn-primary" @click="saveEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- ===== 删除确认弹窗 ===== -->
    <div class="modal-mask" v-if="delShow" @click.self="delShow = false">
      <div class="del-modal">
        <div class="dm-icon">🗑</div>
        <h3>删除预约</h3>
        <p>确定删除与「{{ delTarget && delTarget.doctor_name }}」的这条预约吗？删除后不可恢复。</p>
        <div class="dm-actions">
          <button class="btn-ghost" @click="delShow = false">取消</button>
          <button class="btn-danger" @click="confirmDelete">确认删除</button>
        </div>
      </div>
    </div>

    <!-- ===== 登录 / 注册弹窗 ===== -->
    <div class="modal-mask" v-if="authShow" @click.self="authShow = false">
      <div class="auth-modal">
        <div class="am-head">
          <h3>{{ authMode === 'login' ? '登录账号' : '注册账号' }}</h3>
          <button class="dm-close" @click="authShow = false">×</button>
        </div>

        <div class="role-switch" v-if="authMode === 'register'">
          <button :class="{ on: authForm.role === 'patient' }" @click="authForm.role = 'patient'; authForm.doctor_id = null; selectedDoctor = null">我是患者</button>
          <button :class="{ on: authForm.role === 'doctor' }" @click="authForm.role = 'doctor'">我是医生</button>
        </div>

        <div class="form-grid" v-if="authMode === 'register' && authForm.role === 'doctor'">
          <div class="form-item full">
            <label>选择我的医生信息 <i>*</i></label>
            <input v-model="docSearchKw" placeholder="输入姓名/科室搜索，选择对应医生" @keyup.enter="searchDocForRegister" @input="searchDocForRegister" />
            <div class="doc-pick-list" v-if="docSearchList.length">
              <div class="doc-pick-item" v-for="d in docSearchList" :key="d.id" @click="pickDoctor(d)">
                {{ d.name }} · {{ d.department }} · {{ d.hospital_name }}
              </div>
            </div>
            <div class="doc-picked" v-if="selectedDoctor">✓ 已选择：{{ selectedDoctor.name }}（{{ selectedDoctor.department }}）</div>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-item full">
            <label>手机号 <i>*</i></label>
            <input v-model="authForm.phone" placeholder="用于登录的手机号" />
          </div>
          <div class="form-item full">
            <label>密码 <i>*</i></label>
            <input v-model="authForm.password" type="password" placeholder="设置/输入密码" @keyup.enter="submitAuth" />
          </div>
          <div class="form-item full" v-if="authMode === 'register'">
            <label>姓名</label>
            <input v-model="authForm.real_name" placeholder="真实姓名（选填）" />
          </div>
        </div>

        <div class="am-actions">
          <button class="btn-ghost" @click="toggleAuthMode">{{ authMode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}</button>
          <button class="btn-primary" @click="submitAuth">{{ authMode === 'login' ? '登录' : '注册' }}</button>
        </div>
      </div>
    </div>

    <!-- 轻量提示 -->
    <div class="toast-tip" :class="toast.type" v-if="toast.show">{{ toast.text }}</div>

    <!-- 自定义确认弹窗 -->
    <div class="confirm-mask" v-if="confirmBox.show" @click.self="closeConfirm">
      <div class="confirm-box">
        <p class="confirm-text">{{ confirmBox.text }}</p>
        <div class="confirm-actions">
          <button class="btn-ghost sm" @click="closeConfirm">取消</button>
          <button class="btn-primary sm" @click="doConfirm">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import request from '../api/request'

const router = useRouter()
const route = useRoute()
const view = ref('query')
const today = getTodayString()

// 下拉选项
const hospitals = ref([])
const departments = ref([])

// 医生查询
const filters = reactive({ keyword: '', hospitalId: '', department: '' })
const doctorList = ref([])
const loading = ref(false)

// 详情
const detailShow = ref(false)
const detailDoctor = ref(null)

// 排班
const scheduleHospitalId = ref('')
const scheduleList = ref([])
const scheduleHospitalName = computed(() => {
  const h = hospitals.value.find(x => String(x.value) === String(scheduleHospitalId.value))
  return h ? h.label : ''
})

// 排班统计
const scheduleDepts = computed(() => {
  const set = new Set(scheduleList.value.map(s => s.department))
  return [...set]
})
const scheduleMorning = computed(() => scheduleList.value.filter(s => (s.out_time || '').includes('上午')).length)
const scheduleAfternoon = computed(() => scheduleList.value.filter(s => (s.out_time || '').includes('下午')).length)
const scheduleDeptChart = computed(() => {
  const map = {}
  scheduleList.value.forEach(s => {
    const d = s.department || '其他'
    map[d] = (map[d] || 0) + 1
  })
  const arr = Object.entries(map).map(([name, count]) => ({ name, count }))
  const max = Math.max(...arr.map(a => a.count), 1)
  arr.sort((a, b) => b.count - a.count)
  return arr.slice(0, 6).map(a => ({ ...a, pct: Math.round(a.count / max * 100) }))
})

// 预约
const timeSlots = ['上午 08:30-11:30', '下午 13:30-16:30', '全天 08:00-16:30']
const availableTimeSlots = computed(() => timeSlots.filter(slot => !isPastTimeSlot(appointForm.appoint_date, slot)))
const editableTimeSlots = computed(() => timeSlots.filter(slot => !isPastTimeSlot(editForm.appoint_date, slot)))
const appointDoctor = ref(null)
const pendingAppointmentDoctor = ref(null)
const appointForm = reactive({
  doctor_id: '', doctor_name: '', hospital_id: '', hospital_name: '', department: '',
  patient_name: '', patient_gender: '', patient_age: '', patient_phone: '',
  appoint_date: '', time_slot: '', remark: ''
})

// 我的预约
const minePhone = ref('')
const mineQueried = ref(false)
const appointmentList = ref([])



// 编辑
const editShow = ref(false)
const editForm = reactive({
  id: '', doctor_id: '', doctor_name: '', hospital_name: '', department: '',
  patient_name: '', patient_gender: '', patient_age: '', patient_phone: '',
  appoint_date: '', time_slot: '', remark: ''
})

// 删除
const delShow = ref(false)
const delTarget = ref(null)

// toast
const toast = reactive({ show: false, text: '', type: 'success' })

function showToast(text, type = 'success') {
  toast.text = text
  toast.type = type
  toast.show = true
  setTimeout(() => { toast.show = false }, 2200)
}

function getTodayString() {
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function isPastDate(date) {
  return Boolean(date) && date < today
}

function isPastTimeSlot(date, slot) {
  if (date !== today) return false
  const endMinutes = slot.includes('上午') ? 11 * 60 + 30 : 16 * 60 + 30
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() >= endMinutes
}

// 自定义确认弹窗（替代 window.confirm）
const confirmBox = reactive({ show: false, text: '', onConfirm: null })
function showConfirm(text, onConfirm) {
  confirmBox.text = text
  confirmBox.onConfirm = onConfirm
  confirmBox.show = true
}
function closeConfirm() {
  confirmBox.show = false
  confirmBox.onConfirm = null
}
function doConfirm() {
  const cb = confirmBox.onConfirm
  confirmBox.show = false
  confirmBox.onConfirm = null
  if (cb) cb()
}

// 从异常对象里提取真正的错误信息，避免只显示笼统的“失败，请重试”
function errMsg(e, fallback) {
  if (!e) return fallback
  if (typeof e === 'string') return e
  if (e.msg) return e.msg
  if (e.response && e.response.data) {
    const d = e.response.data
    if (typeof d === 'string') return d
    if (d.msg) return d.msg
    if (d.error) return d.error
  }
  if (e.message) return e.message
  return fallback
}

function splitSpec(str) {
  if (!str) return []
  return str.split('、').filter(Boolean).slice(0, 3)
}

function avatarColor(name) {
  const palette = ['#0d9488', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#0369a1', '#65a30d', '#c026d3']
  let sum = 0
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i)
  return palette[sum % palette.length]
}

// 职级徽章配色
function titleClass(title) {
  if (!title) return 'tt-other'
  if (title.indexOf('副主任医师') === 0) return 'tt-deputy'
  if (title.indexOf('主任医师') === 0) return 'tt-chief'
  if (title.indexOf('主治医师') === 0) return 'tt-attending'
  if (title.indexOf('住院医师') === 0) return 'tt-resident'
  return 'tt-other'
}

// 预约状态标签配色
function statusClass(status) {
  if (!status) return ''
  if (status === '待审核') return 'st-pending'
  if (status === '已同意' || status === '已预约') return 'st-approved'
  if (status === '已拒绝') return 'st-rejected'
  if (status === '已取消') return 'st-cancelled'
  return ''
}

// 解析出诊时间为周历
const WEEK_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
function parseSchedule(outTime) {
  const map = {}
  WEEK_ORDER.forEach(w => { map[w] = [] })
  if (!outTime) return map
  const weeks = outTime.match(/周[一二三四五六日]/g) || []
  let periods = []
  if (outTime.indexOf('全天') > -1) periods = ['上午', '下午']
  else {
    if (outTime.indexOf('上午') > -1) periods.push('上午')
    if (outTime.indexOf('下午') > -1) periods.push('下午')
  }
  weeks.forEach(w => { if (WEEK_ORDER.includes(w)) map[w] = periods.slice() })
  return map
}
const calendar = computed(() => {
  const m = detailDoctor.value ? parseSchedule(detailDoctor.value.out_time) : parseSchedule('')
  return { weekOrder: WEEK_ORDER, map: m }
})

// 预约时段实时占用校验
const slotStatus = ref('idle')
const slotRemaining = ref(null)
const slotBooked = ref(0)
const slotQuota = ref(0)
let checkTimer = null
function resetSlotCheck() {
  slotStatus.value = 'idle'
  slotRemaining.value = null
  slotBooked.value = 0
  slotQuota.value = 0
}
watch(
  () => [appointForm.doctor_id, appointForm.appoint_date, appointForm.time_slot],
  ([did, d, slot]) => {
    clearTimeout(checkTimer)
    if (slot && !availableTimeSlots.value.includes(slot)) {
      appointForm.time_slot = ''
      resetSlotCheck()
      return
    }
    if (!did || !d || !slot) {
      resetSlotCheck()
      return
    }
    slotStatus.value = 'checking'
    checkTimer = setTimeout(async () => {
      try {
        const res = await request.get(`/staff/appoint/check?doctor_id=${did}&date=${d}&slot=${encodeURIComponent(slot)}`)
        if (res.code === 200 && res.data) {
          slotRemaining.value = res.data.remaining
          slotBooked.value = res.data.booked != null ? res.data.booked : 0
          slotQuota.value = res.data.quota != null ? res.data.quota : 0
          slotStatus.value = res.data.busy ? 'busy' : 'ok'
        } else {
          resetSlotCheck()
        }
      } catch (e) {
        resetSlotCheck()
      }
    }, 150)
  }
)

function goBack() {
  router.back()
}

function switchView(v) {
  view.value = v
  if (v === 'schedule' && scheduleHospitalId.value) loadSchedule()
  if (v === 'doctor') {
    loadDoctorAppointments()
    loadSlotConfig()
  }
  if (v === 'mine' && account.value && account.value.role === 'patient') {
    minePhone.value = account.value.phone
    mineQueried.value = false
    loadMine()
  }
}

async function loadOptions() {
  try {
    const res = await request.get('/staff/options')
    if (res.code === 200 && res.data) {
      hospitals.value = res.data.hospitals || []
      departments.value = res.data.departments || []
    }
  } catch (e) {
    console.error('加载选项失败', e)
  }
}

async function loadDoctors() {
  loading.value = true
  try {
    const kw = encodeURIComponent(filters.keyword || '')
    const hid = filters.hospitalId || ''
    const dep = encodeURIComponent(filters.department || '')
    const res = await request.get(`/staff/doctors?keyword=${kw}&hospitalId=${hid}&department=${dep}`)
    doctorList.value = res.data || []
  } catch (e) {
    console.error('查询医生失败', e)
    doctorList.value = []
  } finally {
    loading.value = false
  }
}

function searchDoctors() { loadDoctors() }

function resetFilters() {
  filters.keyword = ''
  filters.hospitalId = ''
  filters.department = ''
  loadDoctors()
}

function openDetail(d) {
  detailDoctor.value = d
  detailShow.value = true
}

function startAppoint(d) {
  pendingAppointmentDoctor.value = d
  // 必须登录患者账号才能预约
  if (!account.value) {
    showToast('请先登录后再预约', 'error')
    openAuth('login')
    return
  }
  if (account.value.role !== 'patient') {
    showToast('只有患者账号才能预约', 'error')
    return
  }
  pendingAppointmentDoctor.value = null
  appointDoctor.value = d
  appointForm.doctor_id = d.id
  appointForm.doctor_name = d.name
  appointForm.hospital_id = d.hospital_id
  appointForm.hospital_name = d.hospital_name
  appointForm.department = d.department
  const isPatient = account.value && account.value.role === 'patient'
  appointForm.patient_name = isPatient ? (account.value.real_name || '') : ''
  appointForm.patient_gender = ''
  appointForm.patient_age = ''
  appointForm.patient_phone = isPatient ? account.value.phone : ''
  appointForm.appoint_date = ''
  appointForm.time_slot = ''
  appointForm.remark = ''
  resetSlotCheck()
  view.value = 'appoint'
}

async function submitAppoint() {
  if (!account.value || account.value.role !== 'patient') {
    showToast('请先登录患者账号后再预约', 'error')
    openAuth('login')
    return
  }
  if (!appointForm.patient_name || !appointForm.patient_phone || !appointForm.appoint_date || !appointForm.time_slot) {
    showToast('请填写姓名、手机号、日期与时间段', 'error')
    return
  }
  if (isPastDate(appointForm.appoint_date)) {
    showToast('预约日期只能选择今天或今后的时间', 'error')
    return
  }
  if (isPastTimeSlot(appointForm.appoint_date, appointForm.time_slot)) {
    showToast('所选时间段已结束，请选择其他时间段', 'error')
    return
  }
  try {
    const res = await request.post('/staff/appoint', { ...appointForm })
    if (res.code === 200) {
      showToast('预约提交成功')
      resetSlotCheck()
      minePhone.value = appointForm.patient_phone
      mineQueried.value = false
      view.value = 'mine'
    } else {
      showToast(res.msg || '提交失败', 'error')
    }
  } catch (e) {
    console.error('提交预约失败', e)
    showToast('提交失败，请重试', 'error')
  }
}

async function loadSchedule() {
  if (!scheduleHospitalId.value) {
    scheduleList.value = []
    return
  }
  try {
    const res = await request.get(`/staff/schedule/${scheduleHospitalId.value}`)
    scheduleList.value = res.data || []
  } catch (e) {
    console.error('查询排班失败', e)
    scheduleList.value = []
  }
}

async function loadMine() {
  if (!minePhone.value) {
    showToast('请输入手机号', 'error')
    return
  }
  try {
    const res = await request.get(`/staff/appointments?phone=${encodeURIComponent(minePhone.value)}`)
    appointmentList.value = res.data || []
    mineQueried.value = true
  } catch (e) {
    console.error('查询预约失败', e)
    appointmentList.value = []
    mineQueried.value = true
  }
}

function openEdit(a) {
  if (!account.value || account.value.phone !== a.patient_phone) {
    showToast('只能编辑本人预约', 'error')
    return
  }
  editForm.id = a.id
  editForm.doctor_id = a.doctor_id
  editForm.doctor_name = a.doctor_name
  editForm.hospital_name = a.hospital_name
  editForm.department = a.department
  editForm.patient_name = a.patient_name
  editForm.patient_gender = a.patient_gender
  editForm.patient_age = a.patient_age
  editForm.patient_phone = a.patient_phone
  editForm.appoint_date = a.appoint_date
  editForm.time_slot = a.time_slot
  editForm.remark = a.remark
  editShow.value = true
}

async function saveEdit() {
  if (!editForm.appoint_date || isPastDate(editForm.appoint_date)) {
    showToast('预约日期只能选择今天或今后的时间', 'error')
    return
  }
  if (!editForm.time_slot || isPastTimeSlot(editForm.appoint_date, editForm.time_slot)) {
    showToast('所选时间段已结束，请选择其他时间段', 'error')
    return
  }
  try {
    const res = await request.post('/staff/appointment/edit', { ...editForm, login_phone: account.value?.phone || '' })
    if (res.code === 200) {
      showToast('修改成功')
      editShow.value = false
      loadMine()
    } else {
      showToast(res.msg || '修改失败', 'error')
    }
  } catch (e) {
    console.error('编辑预约失败', e)
    showToast('修改失败，请重试', 'error')
  }
}

function askDeleteAppt(a) {
  if (!account.value || account.value.phone !== a.patient_phone) {
    showToast('只能删除本人预约', 'error')
    return
  }
  delTarget.value = a
  delShow.value = true
}

async function confirmDelete() {
  if (!delTarget.value) return
  try {
    const res = await request.post('/staff/appointment/delete', { id: delTarget.value.id, login_phone: account.value?.phone || '' })
    if (res.code === 200) {
      showToast('删除成功')
      delShow.value = false
      delTarget.value = null
      loadMine()
    } else {
      showToast(res.msg || '删除失败', 'error')
    }
  } catch (e) {
    console.error('删除预约失败', e)
    showToast('删除失败，请重试', 'error')
  }
}

// ===== 账号体系 =====
const ACCOUNT_KEY = 'medical_staff_account'
const account = ref(null)
const isDoctor = computed(() => account.value && account.value.role === 'doctor')

// 登录 / 注册弹窗
const authShow = ref(false)
const authMode = ref('login') // login | register
const authForm = reactive({ phone: '', password: '', real_name: '', role: 'patient', doctor_id: null })
const docSearchKw = ref('')
const docSearchList = ref([])
const selectedDoctor = ref(null)

// 医生工作台
const doctorAppointments = ref([])
const slotConfigs = ref([])
const msgDrafts = reactive({})

function openAuth(mode) {
  authMode.value = mode
  authForm.phone = ''
  authForm.password = ''
  authForm.real_name = ''
  authForm.role = 'patient'
  authForm.doctor_id = null
  docSearchKw.value = ''
  docSearchList.value = []
  selectedDoctor.value = null
  authShow.value = true
}

function toggleAuthMode() {
  authMode.value = authMode.value === 'login' ? 'register' : 'login'
  authForm.role = 'patient'
  authForm.doctor_id = null
  selectedDoctor.value = null
  docSearchKw.value = ''
  docSearchList.value = []
}

async function searchDocForRegister() {
  if (!docSearchKw.value) {
    docSearchList.value = []
    return
  }
  try {
    const res = await request.get(`/staff/doctors?keyword=${encodeURIComponent(docSearchKw.value)}&hospitalId=&department=`)
    docSearchList.value = (res.data || []).slice(0, 8)
  } catch (e) {
    docSearchList.value = []
  }
}

function pickDoctor(d) {
  selectedDoctor.value = d
  authForm.doctor_id = d.id
  docSearchList.value = []
}

async function submitAuth() {
  if (!authForm.phone || !authForm.password) {
    showToast('请输入手机号与密码', 'error')
    return
  }
  if (authMode.value === 'register') {
    if (authForm.role === 'doctor' && !authForm.doctor_id) {
      showToast('请选择您对应的医生信息', 'error')
      return
    }
    try {
      const res = await request.post('/staff/register', { ...authForm })
      if (res.code === 200) {
        showToast('注册成功，正在登录…')
        await doLogin(authForm.phone, authForm.password)
      } else {
        showToast(res.msg || '注册失败', 'error')
      }
    } catch (e) {
      console.error('注册失败', e)
      showToast(errMsg(e, '注册失败，请重试'), 'error')
    }
  } else {
    await doLogin(authForm.phone, authForm.password)
  }
}

async function doLogin(phone, password) {
  try {
    const res = await request.post('/staff/login', { phone, password })
    if (res.code === 200) {
      account.value = res.data
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(res.data))
      authShow.value = false
      showToast(`欢迎回来，${res.data.real_name || res.data.phone}`)
      if (res.data.role === 'doctor') {
        switchView('doctor')
      } else {
        if (pendingAppointmentDoctor.value) {
          const doctor = pendingAppointmentDoctor.value
          pendingAppointmentDoctor.value = null
          startAppoint(doctor)
          return
        }
        minePhone.value = res.data.phone
        mineQueried.value = false
        switchView('mine')
        loadMine()
      }
    } else {
      showToast(res.msg || '登录失败', 'error')
    }
  } catch (e) {
    console.error('登录失败', e)
    showToast(errMsg(e, '登录失败，请重试'), 'error')
  }
}

function logout() {
  account.value = null
  localStorage.removeItem(ACCOUNT_KEY)
  doctorAppointments.value = []
  slotConfigs.value = []
  showToast('已退出登录')
  view.value = 'query'
}

async function loadDoctorAppointments() {
  if (!account.value || !account.value.doctor_id) return
  try {
    const res = await request.get(`/staff/appointments/doctor?doctor_id=${account.value.doctor_id}`)
    doctorAppointments.value = res.data || []
    doctorAppointments.value.forEach(a => { msgDrafts[a.id] = (a.doctor_msg && a.doctor_msg !== '请及时就医') ? a.doctor_msg : '' })
  } catch (e) {
    console.error('查询医生预约失败', e)
    doctorAppointments.value = []
  }
}

async function loadSlotConfig() {
  if (!account.value || !account.value.doctor_id) return
  try {
    const res = await request.get(`/staff/slot-config/${account.value.doctor_id}`)
    slotConfigs.value = res.data || []
  } catch (e) {
    console.error('查询额度失败', e)
    slotConfigs.value = []
  }
}

function changeQuota(c, delta) {
  c.quota = Math.max(0, (parseInt(c.quota) || 0) + delta)
}

async function saveSlotConfig() {
  if (!account.value || !account.value.doctor_id) return
  try {
    const res = await request.post('/staff/slot-config', {
      doctor_id: account.value.doctor_id,
      configs: slotConfigs.value.map(c => ({ slot: c.slot, quota: c.quota }))
    })
    if (res.code === 200) {
      showToast('额度设置成功')
    } else {
      showToast(res.msg || '保存失败', 'error')
    }
  } catch (e) {
    console.error('保存额度失败', e)
    showToast('保存失败，请重试', 'error')
  }
}

async function saveDoctorMsg(a) {
  const text = (msgDrafts[a.id] != null ? msgDrafts[a.id] : '').trim()
  try {
    const res = await request.post('/staff/appointment/msg', { id: a.id, doctor_msg: text })
    if (res.code === 200) {
      a.doctor_msg = text
      showToast('留言已保存')
    } else {
      showToast(res.msg || '留言失败', 'error')
    }
  } catch (e) {
    console.error('留言失败', e)
    showToast('留言失败，请重试', 'error')
  }
}

async function deleteDoctorMsg(a) {
  showConfirm('确定删除这条留言吗？', async () => {
    try {
      const res = await request.post('/staff/appointment/msg-delete', { id: a.id })
      if (res.code === 200) {
        a.doctor_msg = ''
        msgDrafts[a.id] = ''
        showToast('留言已删除')
      } else {
        showToast(res.msg || '删除失败', 'error')
      }
    } catch (e) {
      console.error('删除留言失败', e)
      showToast('删除失败，请重试', 'error')
    }
  })
}

// 医生确认就诊 → 给患者发送"请及时就医"留言
async function confirmAppointment(a) {
  showConfirm('确认通知该患者按时就诊吗？', async () => {
    const msg = '请及时就医'
    try {
      const res = await request.post('/staff/appointment/msg', { id: a.id, doctor_msg: msg })
      if (res.code === 200) {
        a.doctor_msg = msg
        showToast('已通知患者及时就医')
      } else {
        showToast(res.msg || '操作失败', 'error')
      }
    } catch (e) {
      console.error('确认就诊失败', e)
      showToast('操作失败，请重试', 'error')
    }
  })
}

onMounted(async () => {
  loadOptions()
  try {
    const saved = localStorage.getItem(ACCOUNT_KEY)
    if (saved) account.value = JSON.parse(saved)
  } catch (e) {
    /* ignore */
  }
  await loadDoctors()
  const doctorId = route.query.doctorId
  if (doctorId) {
    const doctor = doctorList.value.find(d => String(d.id) === String(doctorId))
    if (doctor) startAppoint(doctor)
  }
})
</script>

<style scoped>
/* ============ 青绿医疗风 · 专业、清新、有温度 ============ */
.staff-page {
  min-height: 100vh;
  background: #f0fdfa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  color: #1f2937;
  display: flex;
  flex-direction: column;
}

/* 顶部 */
.staff-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  box-shadow: 0 4px 20px rgba(13, 148, 136, 0.25);
}
.hd-left { display: flex; align-items: center; gap: 16px; }
.back-btn {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 7px 16px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 14px;
  transition: background .2s;
}
.back-btn:hover { background: rgba(255, 255, 255, 0.24); }
.hd-title .hd-kicker {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 1.5px;
}
.hd-title h1 { margin: 2px 0 0; font-size: 21px; font-weight: 600; color: #fff; }
.hd-sub { font-size: 13px; color: rgba(255, 255, 255, 0.88); }

/* 标签页 - 胶囊式 */
.tab-bar {
  display: flex;
  gap: 6px;
  padding: 12px 28px;
  background: #fff;
  border-bottom: 1px solid #e5eaf0;
}
.tab-bar button {
  border: none;
  background: transparent;
  padding: 8px 20px;
  cursor: pointer;
  font-size: 14px;
  color: #5b6b7f;
  border-radius: 20px;
  transition: all .25s;
}
.tab-bar button:not(.active):hover { color: #0d9488; background: #f0fdfa; }
.tab-bar button.active { color: #fff; background: linear-gradient(135deg, #0d9488, #0f766e); font-weight: 600; box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3); }
.tab-bar button.tri-entry {
  color: #b45309;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border: 1px solid #fcd34d;
  font-weight: 600;
}
.tab-bar button.tri-entry:hover { color: #92400e; background: linear-gradient(135deg, #fef3c7, #fde68a); }

.view-body { padding: 24px 28px; max-width: 1200px; margin: 0 auto; }

/* 筛选栏 */
.filter-bar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
  background: #fff;
  border-radius: 14px;
  padding: 16px 18px;
  margin-bottom: 18px;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06);
  border: 1px solid #e0f2f1;
}
.search-input {
  flex: 1;
  min-width: 240px;
  padding: 10px 16px;
  border: 1px solid #d1e0dd;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  color: #1f2937;
  outline: none;
  transition: all .2s;
}
.search-input:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); background: #fff; }
.select-box {
  padding: 10px 14px;
  border: 1px solid #d1e0dd;
  border-radius: 8px;
  font-size: 14px;
  background: #f9fafb;
  color: #1f2937;
  outline: none;
  transition: all .2s;
}
.select-box:focus { border-color: #0d9488; box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12); background: #fff; }
.select-box.wide { min-width: 320px; }

/* 按钮 */
.btn-primary {
  background: linear-gradient(135deg, #0d9488, #0f766e);
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
  box-shadow: 0 2px 8px rgba(13, 148, 136, 0.25);
}
.btn-primary:hover { background: linear-gradient(135deg, #0f766e, #115e59); box-shadow: 0 4px 12px rgba(13, 148, 136, 0.35); }
.btn-warm {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.25);
}
.btn-warm:hover { background: linear-gradient(135deg, #d97706, #b45309); }
.btn-ghost {
  background: #fff;
  color: #0d9488;
  border: 1px solid #b5c8c4;
  padding: 9px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.btn-ghost:hover { background: #f0fdfa; border-color: #0d9488; }
.btn-danger {
  background: #ef4444;
  color: #fff;
  border: none;
  padding: 10px 22px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all .2s;
}
.btn-danger:hover { background: #dc2626; }
.btn-primary.sm, .btn-warm.sm, .btn-ghost.sm, .btn-danger.sm { padding: 7px 16px; font-size: 13px; }

.doctor-count { font-size: 13px; color: #6b7b8f; margin-bottom: 14px; }
.doctor-count b { color: #0d9488; font-size: 16px; }

/* 医生卡片 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}
@media (max-width: 900px) { .card-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .card-grid { grid-template-columns: 1fr; } }
.doc-card {
  background: #fff;
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.03);
  transition: all .25s;
  border-top: 3px solid transparent;
}
.doc-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(13, 148, 136, 0.15); border-top-color: #0d9488; }
.doc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 21px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.avatar.lg { width: 60px; height: 60px; font-size: 24px; }
.doc-name h3 { margin: 0; font-size: 17px; font-weight: 600; color: #134e4a; display: flex; align-items: center; gap: 6px; }
.gender { font-size: 12px; color: #6b7b8f; font-weight: normal; }
.title-tag {
  display: inline-block;
  margin-top: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 4px;
  line-height: 1.6;
}
/* 职级徽章配色 */
.tt-chief { background: #fef2f2; color: #b91c1c; }
.tt-deputy { background: #fffbeb; color: #b45309; }
.tt-attending { background: #ecfdf5; color: #047857; }
.tt-resident { background: #f0fdfa; color: #0f766e; }
.tt-other { background: #f0f4f8; color: #5f6b7a; }

.doc-line { font-size: 13px; color: #4b5563; margin-bottom: 8px; }
.doc-line .lbl { display: inline-block; width: 36px; color: #6b7b8f; }
.tag-row { display: flex; gap: 6px; flex-wrap: wrap; margin: 10px 0 16px; min-height: 24px; }
.spec-tag { font-size: 12px; color: #0d9488; background: #ccfbf1; padding: 3px 10px; border-radius: 999px; }
.doc-actions { display: flex; gap: 10px; justify-content: flex-end; border-top: 1px solid #f0fdfa; padding-top: 14px; }

/* 排班表 */
.schedule-card { background: #fff; border-radius: 14px; padding: 24px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06); border: 1px solid #e0f2f1; }
.sc-title { margin: 0 0 16px; font-size: 17px; font-weight: 600; color: #134e4a; }
.sc-table { width: 100%; border-collapse: collapse; }
.sc-table th, .sc-table td {
  text-align: left;
  padding: 13px 16px;
  font-size: 14px;
  border-bottom: 1px solid #f0fdfa;
}
.sc-table th { color: #6b7b8f; font-weight: 600; background: #f0fdfa; }
.sc-table th:first-child { border-radius: 8px 0 0 8px; }
.sc-table th:last-child { border-radius: 0 8px 8px 0; }
.sc-table td b { color: #134e4a; }
.sc-table tbody tr { transition: background .15s; }
.sc-table tbody tr:hover { background: #f0fdfa; }

/* 我的预约 */
.appt-list { display: flex; flex-direction: column; gap: 14px; }
.appt-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06);
  border-left: 4px solid #0d9488;
  transition: transform .2s;
}
.appt-card:hover { transform: translateX(2px); }
.appt-main h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; color: #134e4a; }
.muted { color: #6b7b8f; font-weight: normal; font-size: 14px; }
.appt-line { font-size: 13px; color: #4b5563; margin-bottom: 5px; }
.status-tag { display: inline-block; margin-top: 4px; font-size: 12px; color: #047857; background: #ecfdf5; padding: 3px 12px; border-radius: 4px; }
.status-tag.st-pending { color: #b45309; background: #fef3c7; }
.status-tag.st-approved { color: #047857; background: #ecfdf5; }
.status-tag.st-rejected { color: #b91c1c; background: #fef2f2; }
.status-tag.st-cancelled { color: #6b7280; background: #f3f4f6; }
.appt-actions { display: flex; flex-direction: column; gap: 10px; }

/* 预约表单 */
.appoint-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
@media (max-width: 900px) { .appoint-layout { grid-template-columns: 1fr; } }
.appoint-box { background: #fff; border-radius: 14px; padding: 28px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06); border: 1px solid #e0f2f1; }
.ap-title { margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #134e4a; }
.ap-doctor { display: flex; align-items: center; gap: 14px; padding: 15px; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-radius: 10px; margin-bottom: 24px; }
.ap-doc-name { font-size: 16px; color: #134e4a; font-weight: 600; }
.ap-doc-sub { font-size: 13px; color: #6b7b8f; margin-top: 4px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full { grid-column: 1 / -1; }
.form-item label { font-size: 13px; color: #4b5563; }
.form-item label i { color: #ef4444; font-style: normal; }
.form-item input, .form-item select {
  padding: 10px 14px;
  border: 1px solid #d1e0dd;
  border-radius: 8px;
  font-size: 14px;
  color: #1f2937;
  background: #f9fafb !important;
  outline: none;
  transition: all .2s;
}
.form-item input:focus, .form-item select:focus {
  border-color: #0d9488;
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.12);
  background: #fff !important;
  color: #1f2937 !important;
}
.form-item input:-webkit-autofill,
.form-item input:-webkit-autofill:hover,
.form-item input:-webkit-autofill:focus,
.form-item input:-webkit-autofill:active {
  -webkit-text-fill-color: #1f2937 !important;
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  box-shadow: 0 0 0 1000px #fff inset !important;
  background: #fff !important;
  transition: background-color 9999s ease-out 0s;
}
.ap-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 26px; width: 100%; }
.ap-actions .ap-btn {
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box !important;
  padding: 10px 22px !important;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 30, 50, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.detail-modal, .edit-modal, .del-modal {
  background: #fff;
  border-radius: 16px;
  padding: 26px;
  width: 460px;
  max-width: 92vw;
  box-shadow: 0 24px 60px rgba(13, 40, 36, 0.25);
  animation: popIn .18s ease;
  max-height: 88vh;
  overflow-y: auto;
}
.del-modal { width: 350px; text-align: center; }
@keyframes popIn { from { transform: scale(.94); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.dm-head { display: flex; align-items: center; gap: 14px; position: relative; margin-bottom: 18px; }
.dm-title h3 { margin: 0; font-size: 18px; font-weight: 600; color: #134e4a; display: flex; align-items: center; gap: 6px; }
.dm-close { position: absolute; top: 0; right: 0; border: none; background: none; font-size: 26px; color: #9ca3af; cursor: pointer; transition: color .2s; }
.dm-close:hover { color: #0d9488; }
.dm-info .dm-row { display: flex; margin-bottom: 10px; font-size: 14px; }
.dm-row b { width: 72px; color: #6b7b8f; font-weight: 500; flex-shrink: 0; }
.dm-row span { color: #1f2937; }
.dm-intro { margin-top: 14px; padding: 14px; border-radius: 10px; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); }
.dm-intro h4 { margin: 0 0 8px; font-size: 14px; font-weight: 600; color: #134e4a; }
.dm-intro p { margin: 0; font-size: 14px; line-height: 1.9; color: #4b5563; }
.dm-actions { display: flex; justify-content: flex-end; margin-top: 18px; }

.em-title { margin: 0 0 18px; font-size: 17px; font-weight: 600; color: #134e4a; }
.em-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }
.em-actions button {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 14px;
}
.dm-icon { font-size: 34px; }
.del-modal h3 { margin: 10px 0 8px; font-size: 17px; font-weight: 600; color: #134e4a; }
.del-modal p { margin: 0 0 20px; font-size: 13px; color: #4b5563; line-height: 1.7; }
.del-modal .dm-actions { display: flex; gap: 12px; justify-content: center; }

/* 医生头像照片 */
.avatar-photo {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid #ccfbf1;
  background: #f0fdfa;
}

/* 出诊日历 */
.dm-calendar { margin-top: 16px; }
.dm-calendar h4 { margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #134e4a; }
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.cal-cell {
  text-align: center;
  padding: 8px 2px;
  border-radius: 8px;
  background: #f0fdfa;
  color: #6b7b8f;
}
.cal-cell .cal-day { font-size: 12px; font-weight: 600; margin-bottom: 3px; }
.cal-cell .cal-slots { font-size: 11px; line-height: 1.4; }
.cal-cell.on { background: #ccfbf1; color: #0f766e; }

/* 预约时段占用提示 */
.slot-hint { font-size: 12px; margin-top: 4px; }
.slot-hint.ok { color: #047857; }
.slot-hint.busy { color: #b45309; }
.slot-hint.checking { color: #6b7280; }

/* toast */
.toast-tip {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  animation: popIn .18s ease;
  white-space: nowrap;
}
.toast-tip.success { background: linear-gradient(135deg, #0d9488, #0f766e); }
.toast-tip.error { background: #ef4444; }

/* 自定义确认弹窗 */
.confirm-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; animation: popIn .15s ease;
}
.confirm-box {
  background: #fff; border-radius: 12px; padding: 18px 22px;
  min-width: 220px; max-width: 300px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.2);
}
.confirm-text { margin: 0 0 16px; font-size: 13px; color: #1f2937; line-height: 1.6; text-align: center; }
.confirm-actions { display: flex; flex-direction: column; gap: 8px; }
.confirm-actions button {
  width: 100%;
  padding: 6px 14px !important;
  font-size: 12px;
  border-radius: 6px;
  box-sizing: border-box;
}

/* 医生确认就诊按钮 */
.doc-appt-actions { margin-top: 10px; }
.btn-confirm-appt {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff; border: none; padding: 7px 16px; border-radius: 6px;
  cursor: pointer; font-size: 13px; transition: all .2s;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}
.btn-confirm-appt:hover { background: linear-gradient(135deg, #059669, #047857); box-shadow: 0 3px 10px rgba(16, 185, 129, 0.3); }

.empty { text-align: center; color: #9ca3af; font-size: 14px; padding: 54px 0; }

/* ===== 账号体系 / 医生工作台 ===== */
.hd-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.usr-chip {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 6px 14px;
  border-radius: 18px;
  font-size: 13px;
}
.hd-btn {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.4);
  padding: 7px 16px;
  border-radius: 18px;
  cursor: pointer;
  font-size: 13px;
  transition: background .2s;
}
.hd-btn:hover { background: rgba(255, 255, 255, 0.26); }
.hd-btn.primary { background: #fff; color: #0f766e; font-weight: 600; }
.hd-btn.primary:hover { background: #f0fdfa; }

/* 医生工作台 */
.doctor-panel { display: flex; flex-direction: column; gap: 18px; }
.dp-head { display: flex; align-items: baseline; gap: 12px; }
.dp-head h2 { margin: 0; font-size: 20px; font-weight: 600; color: #134e4a; }
.quota-card { background: #fff; border-radius: 14px; padding: 22px 24px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06); border: 1px solid #e0f2f1; }
.quota-tip { margin: 0 0 18px; font-size: 13px; color: #6b7b8f; }
.quota-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
@media (max-width: 760px) { .quota-grid { grid-template-columns: 1fr; } }
.quota-item { background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border: 1px solid #99f6e4; border-radius: 10px; padding: 16px; }
.quota-slot { display: block; font-size: 14px; font-weight: 600; color: #134e4a; margin-bottom: 12px; }
.quota-ctrl { display: flex; align-items: center; gap: 8px; }
.quota-ctrl input {
  width: 76px;
  padding: 8px 10px;
  border: 1px solid #d1e0dd;
  border-radius: 8px;
  font-size: 15px;
  text-align: center;
  outline: none;
}
.quota-ctrl input:focus { border-color: #0d9488; }
.q-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #99f6e4;
  background: #fff;
  color: #0d9488;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.q-btn:hover { background: #f0fdfa; }
.quota-unit { font-size: 12px; color: #6b7b8f; }
.dp-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
.dp-sub-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.dp-sub-head .sc-title { margin: 0; }

.doc-appt { align-items: flex-start; }
.appt-right { min-width: 300px; max-width: 420px; flex: 1; }
.msg-box { background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-radius: 10px; padding: 12px 14px; }
.msg-label { display: block; font-size: 13px; font-weight: 600; color: #134e4a; margin-bottom: 8px; }
.msg-box textarea {
  width: 100%;
  border: 1px solid #d1e0dd;
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
  resize: vertical;
  outline: none;
  color: #1f2937;
  background: #fff;
  font-family: inherit;
}
.msg-box textarea:focus { border-color: #0d9488; }
.msg-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
.msg-saved { margin-top: 8px; font-size: 13px; color: #047857; background: #ecfdf5; padding: 6px 10px; border-radius: 6px; }

/* 患者侧医生留言 */
.appt-msg { font-size: 13px; color: #0f766e; background: #ccfbf1; padding: 8px 12px; border-radius: 6px; margin: 8px 0 4px; }

/* 登录注册弹窗 */
.auth-modal {
  background: #fff;
  border-radius: 16px;
  padding: 26px;
  width: 460px;
  max-width: 92vw;
  box-shadow: 0 24px 60px rgba(13, 40, 36, 0.25);
  animation: popIn .18s ease;
  max-height: 88vh;
  overflow-y: auto;
}
.am-head { display: flex; justify-content: space-between; align-items: center; position: relative; margin-bottom: 16px; }
.am-head h3 { margin: 0; font-size: 18px; font-weight: 600; color: #134e4a; }
.role-switch { display: flex; gap: 8px; margin-bottom: 16px; }
.role-switch button {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1e0dd;
  background: #fff;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #4b5563;
  transition: all .2s;
}
.role-switch button.on { border-color: #0d9488; color: #0d9488; background: #f0fdfa; font-weight: 600; }
.am-actions { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
.am-actions button { min-width: 0; width: 100%; }

/* 医生选择 */
.doc-pick-list { margin-top: 8px; border: 1px solid #e5eaf0; border-radius: 8px; max-height: 180px; overflow-y: auto; }
.doc-pick-item { padding: 10px 12px; font-size: 13px; color: #1f2937; cursor: pointer; border-bottom: 1px solid #f0fdfa; }
.doc-pick-item:hover { background: #f0fdfa; }
.doc-pick-item:last-child { border-bottom: none; }
.doc-picked { margin-top: 8px; font-size: 13px; color: #047857; background: #ecfdf5; padding: 8px 12px; border-radius: 6px; }

/* ===== 预约页侧栏 ===== */
.appoint-aside { display: flex; flex-direction: column; gap: 16px; }
.aa-card { background: #fff; border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06); border: 1px solid #e0f2f1; }
.aa-card-title { font-size: 14px; font-weight: 600; color: #134e4a; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #ccfbf1; }
.aa-doctor-card .aa-doc-row { display: flex; font-size: 13px; margin-bottom: 9px; line-height: 1.6; }
.aa-doctor-card .aa-lbl { width: 50px; color: #6b7b8f; flex-shrink: 0; }
.aa-doctor-card .aa-doc-row b { color: #134e4a; font-weight: 600; }
.aa-doc-spec { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid #f0fdfa; }
.aa-slot-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; font-size: 13px; color: #4b5563; }
.aa-slot-dot { width: 8px; height: 8px; border-radius: 50%; background: #d1e0dd; flex-shrink: 0; transition: all .2s; }
.aa-slot-dot.on { background: #0d9488; box-shadow: 0 0 0 3px rgba(13,148,136,0.18); }
.aa-tips .aa-tip-list { margin: 0; padding-left: 16px; list-style: none; }
.aa-tips .aa-tip-list li { font-size: 13px; color: #4b5563; line-height: 1.8; margin-bottom: 6px; position: relative; padding-left: 4px; }
.aa-tips .aa-tip-list li::before { content: '•'; color: #0d9488; position: absolute; left: -14px; font-weight: bold; }

/* ===== 我的预约 — 全宽单列 ===== */
.mine-view { max-width: 1400px; }

/* 顶部 Banner */
.mine-banner {
  display: flex; align-items: center; justify-content: space-between;
  background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
  border-radius: 14px; padding: 24px 28px; margin-bottom: 16px;
  box-shadow: 0 6px 20px rgba(13, 148, 136, 0.22);
}
.mb-left { display: flex; align-items: center; gap: 16px; }
.mb-icon { font-size: 36px; }
.mb-title { font-size: 20px; font-weight: 700; color: #fff; }
.mb-sub { font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px; }
.mb-stats { display: flex; gap: 12px; }
.mb-stat { text-align: center; min-width: 72px; padding: 10px 16px; background: rgba(255,255,255,0.15); border-radius: 10px; border: 1px solid rgba(255,255,255,0.25); }
.mb-stat-num { font-size: 26px; font-weight: 700; color: #fff; line-height: 1.2; }
.mb-stat-lbl { font-size: 12px; color: rgba(255,255,255,0.75); margin-top: 2px; }
@media (max-width: 640px) { .mine-banner { flex-direction: column; gap: 16px; } }

/* 预约卡片头部 */
.appt-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.appt-card-head h3 { margin: 0; font-size: 16px; font-weight: 600; color: #134e4a; }

/* 预约信息网格 */
.appt-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
@media (max-width: 640px) { .appt-info-grid { grid-template-columns: 1fr; } }
.appt-info-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4b5563; }
.ai-icon { font-size: 14px; flex-shrink: 0; }

/* 横排操作按钮 */
.appt-actions-h { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; padding-top: 14px; border-top: 1px solid #f0fdfa; }
.appt-lock-tip { font-size: 12px; color: #9ca3af; }

/* 空状态 */
.mine-empty { text-align: center; padding: 60px 0 40px; }
.me-icon { font-size: 48px; margin-bottom: 12px; opacity: 0.6; }
.mine-empty p { font-size: 14px; color: #6b7b8f; margin: 0; }

/* 底部提示条 */
.mine-tips-bar {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px;
}
@media (max-width: 900px) { .mine-tips-bar { grid-template-columns: 1fr 1fr; } }
@media (max-width: 500px) { .mine-tips-bar { grid-template-columns: 1fr; } }
.mtb-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4b5563; background: #fff; border: 1px solid #e0f2f1; border-radius: 10px; padding: 12px 16px; }
.mtb-icon { font-size: 16px; flex-shrink: 0; }

/* ===== 排班页侧栏 ===== */
.schedule-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: start; }
@media (max-width: 900px) { .schedule-layout { grid-template-columns: 1fr; } }
.schedule-main { min-width: 0; }
.schedule-aside { display: flex; flex-direction: column; gap: 16px; }
.sa-card { background: #fff; border-radius: 14px; padding: 18px 20px; box-shadow: 0 4px 16px rgba(13, 148, 136, 0.06); border: 1px solid #e0f2f1; }
.sa-card-title { font-size: 14px; font-weight: 600; color: #134e4a; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 2px solid #ccfbf1; }
.sa-tip-list { margin: 0; padding-left: 16px; list-style: none; }
.sa-tip-list li { font-size: 13px; color: #4b5563; line-height: 1.8; margin-bottom: 6px; position: relative; padding-left: 4px; }
.sa-tip-list li::before { content: '•'; color: #0d9488; position: absolute; left: -14px; font-weight: bold; }

/* 排班概览 */
.sa-overview { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px; }
.sa-ov-item { text-align: center; padding: 14px 8px; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-radius: 10px; }
.sa-ov-num { font-size: 26px; font-weight: 700; color: #0d9488; line-height: 1.2; }
.sa-ov-lbl { font-size: 12px; color: #6b7b8f; margin-top: 4px; }
.sa-dept-chart { display: flex; flex-direction: column; gap: 8px; }
.sa-dept-bar { display: flex; align-items: center; gap: 8px; }
.sa-dept-name { font-size: 12px; color: #4b5563; min-width: 60px; max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sa-dept-track { flex: 1; height: 8px; background: #f0fdfa; border-radius: 4px; overflow: hidden; }
.sa-dept-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #2dd4bf, #0d9488); transition: width .4s ease; }
.sa-dept-count { font-size: 12px; font-weight: 600; color: #0d9488; min-width: 16px; }
.sa-quote { display: flex; gap: 10px; align-items: flex-start; background: linear-gradient(135deg, #f0fdfa, #ccfbf1); border-color: #99f6e4; }
.sa-quote-icon { font-size: 18px; flex-shrink: 0; }
.sa-quote p { margin: 0; font-size: 13px; color: #134e4a; line-height: 1.7; }
</style>