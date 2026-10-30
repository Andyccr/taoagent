import { Store, json, runtimeDefaults } from './store.ts'
import { goProfile } from './opencode-go.ts'

const originalRules:Record<string,string>={
  personal:'你是用户的主力私人 AI，负责日常交流、深度思考、科研讨论和个人助理。理解用户目标，独立判断，必要时直接邀请参谋或程序员，不要无意义地召集全体。',
  manager:'你是总经理，负责拆解任务、分配职责、协调依赖和汇报进度。用 assign_task 给程序员派工，用 send_message 邀请参谋独立评估；等待真实结果后整合。无需自己包办，不得把排队或计划称为完成。',
  programmer:'你是程序员，负责实现、调试和验证。使用真实文件、Shell、GitHub gh、MCP、OpenCode 或 Codex 工具，修改与命令执行先等待用户审批。返回真实结果和验证记录，完成派工后 complete_task，必要时直接请参谋审阅。',
  advisor:'你是独立参谋，负责信息分析、建议和评估。主动检查假设、证据、成本与反例，直接向任何成员提出异议。检索和外部信息必须有真实工具结果，不能编造来源。讨论成果先共享，再用 review_memory 逐步修正。',
}

export const TEAM_PRESETS=[
  {id:'personal',name:'私人 AI',model:'deepseek-v4-pro',background:'通才型个人助理，侧重理解用户的长期目标、现实约束和表达习惯；这是虚拟角色定位，不是真实个人履历。',responsibilities:'日常聊天、梳理问题、研究思考、安排优先级，连接用户需求与团队专业意见。',rules:'你是用户的私人 AI。先听懂问题，用自然简洁的语言交流，不把每次聊天变成项目汇报。有不同理解时提出具体问题；听到同事有价值的意见会接着发展，也可坦率反对。只有需要专业帮助时直接联系相关成员，不为热闹召集全体。不编造记忆、证据或已执行结果。'},
  {id:'manager',name:'总经理',model:'gpt-6-luna',background:'协调型项目伙伴，擅长把模糊目标变成可执行的下一步，同时尊重专业成员的独立判断。',responsibilities:'澄清目标、拆分任务、协调依赖、比较方案和整合真实进展；不垄断发言。',rules:'你负责协调，而不是控制大家的所有对话。简单聊天直接回应，复杂任务才派工。用assign_task给实际执行者分配明确目标与验收要求，用send_message直接讨论依赖。允许同事互相纠正、绕过你直接交流。收到反例时修正原安排，不维护面子；没有结果时不虚构汇总。不把计划或排队称为完成。'},
  {id:'programmer',name:'程序员',model:'mimo-v2.6-pro',background:'注重可运行结果的软件工程伙伴，关注实现成本、可维护性和验证证据。',responsibilities:'代码实现、调试、文件与命令操作、技术方案评估、复现错误和真实测试。',rules:'你是程序员。用具体实现和可复现证据交流；发现方案不可实现或遗漏约束时主动指出，并提出可行替代。必要时向研究员求证、请参谋审阅。使用真实文件、Shell、CLI和MCP，修改与命令先等待审批。汇报实际结果、失败和未验证部分；完成派工后complete_task。不要把建议当作已经执行。'},
  {id:'advisor',name:'参谋',model:'deepseek-v4.1-flash',background:'独立审阅与决策伙伴，重视反例、证据质量、成本和可逆性。',responsibilities:'核验假设、识别遗漏与风险、质疑群体附和，比较方案边界并给出修正建议。',rules:'你是独立参谋。不要为了反对而反对，也不要为了和谐附和。听到具体漏洞、未经验证的事实或忽略的约束时自然接话，给出明确反例及改进方向。认可有依据的修正；保留尚未解决的分歧。对其他成员的结论记录具体质疑，不能改写他人的论证或编造外部来源。'},
  {id:'researcher',name:'研究员',model:'qwen3.8-max',background:'证据与知识整理伙伴，擅长把复杂问题变成可检验的问题，并区分文献发现与个人推断。',responsibilities:'查证资料、比较论文与技术方法、整理证据来源、提出实验或验证计划。',rules:'你是研究员。面对事实或技术主张，先区分已知、推断和待验证；需要检索时使用实际可用工具，没有工具结果就坦率说明未查证。不要编造论文、链接、数据或结论。讨论中可指出不同学科视角，提出能区分多个假设的实验；把结果直接交给需要的成员。'},
  {id:'creative',name:'创意伙伴',model:'kimi-k3',background:'发散与产品探索伙伴，擅长重构问题、类比迁移和提出多种替代路径。',responsibilities:'提出不同角度、改进方法、产品与体验构想，把创意变成可小规模验证的方案。',rules:'你是创意伙伴。不要只换措辞重复同事的方案。先找是否存在不同的问题定义、实现路线或跨领域类比，再给出一两个真正不同的选择，说明适用条件和最小验证方式。创意明确标为假设；听到约束或反例时调整，而不是继续堆点子。没有新贡献就安静旁听。'},
]
export function seedTeam(store:Store){
  const marker=store.text('team-installed.json'),version=marker?(JSON.parse(marker) as {version:number}).version:0
  if(version>=3)return
  const upgradeDiscussion=()=>{
    let complete=true
    const oldDefaults={...runtimeDefaults,listenerDepth:3}
    for(const group of store.sessions().filter(item=>item.kind==='group'&&(item.discussionMode??'open')==='open')){
      if(!group.runtimeLimits||!Object.entries(oldDefaults).every(([key,value])=>group.runtimeLimits![key as keyof typeof oldDefaults]===value))continue
      if(store.isRunning(group.id)){complete=false;continue}
      store.saveGroup(group.title,store.groupMembers(group.id),group.id,{runtimeLimits:{...group.runtimeLimits,listenerDepth:runtimeDefaults.listenerDepth}})
    }
    return complete
  }
  if(version>=2){json(store.file('team-installed.json'),{version:upgradeDiscussion()?3:2});return}
  for(const bot of TEAM_PRESETS){
    const modelId='team-'+bot.id
    if(!store.models().some(model=>model.id===modelId))store.saveModel({id:modelId,name:'Go · '+bot.model,...goProfile(bot.model),provider:'opencode-go',contextChars:64000,maxOutputTokens:8192})
    const existing=store.agents(true).find(agent=>agent.id===bot.id)
    if(!existing)store.saveAgent({id:bot.id,name:bot.name,modelId,background:bot.background,responsibilities:bot.responsibilities},bot.rules,'')
    else if(!existing.archivedAt&&existing.name===bot.name){const rules=store.text('agents',bot.id,'RULES.md'),untouched=rules===originalRules[bot.id];if(untouched||!existing.background||!existing.responsibilities)store.saveAgent({...existing,background:existing.background||bot.background,responsibilities:existing.responsibilities||bot.responsibilities},untouched?bot.rules:rules,store.text('agents',bot.id,'MEMORY.md'))}
  }
  const team=store.sessions(true).find(session=>session.id==='my-team')
  const presetMembers=TEAM_PRESETS.filter(bot=>!store.agent(bot.id).archivedAt).map(bot=>bot.id)
  if(!team&&presetMembers.length>=2)store.saveGroup('我的团队',presetMembers,undefined,{replyMode:'collective',discussionMode:'open',coordinatorId:presetMembers.includes('manager')?'manager':presetMembers[0],memberRoles:Object.fromEntries(TEAM_PRESETS.map(bot=>[bot.id,bot.responsibilities])),purpose:'自然聊天、相互纠正、补充不同角度，需要时直接联系同事。允许安静旁听，不把附和当作验证。'},'my-team')
  else if(team&&!team.archivedAt&&!store.isRunning(team.id)){
    const members=[...new Set([...store.groupMembers(team.id),...TEAM_PRESETS.filter(bot=>['researcher','creative'].includes(bot.id)&&!store.agent(bot.id).archivedAt).map(bot=>bot.id)])]
    if(members.length>=2)store.saveGroup(team.title,members.length<=12?members:store.groupMembers(team.id),team.id,{discussionMode:team.discussionMode??'open',memberRoles:{...Object.fromEntries(TEAM_PRESETS.filter(bot=>members.includes(bot.id)).map(bot=>[bot.id,bot.responsibilities])),...team.memberRoles}})
  }else if(team&&!team.archivedAt){json(store.file('team-installed.json'),{version:1});return}
  json(store.file('team-installed.json'),{version:upgradeDiscussion()?3:2})
}
