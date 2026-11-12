"""Original editorial drafts. Model authored; no independent language review claimed.
Each topic has a base story and three explicitly labelled reading editions.
Questions have stable IDs: shared questions never pretend to be new across editions.
"""
import pathlib
import json,pathlib,re,hashlib
from additional_stories import more
root=pathlib.Path(__file__).resolve().parents[1];out=root.parent/'data'
def load(n):return json.loads((out/n).read_text(encoding='utf8'))
def write(n,v):(out/n).write_text(json.dumps(v,ensure_ascii=False,separators=(',',':')),encoding='utf8')
# lemma | pos | learner English | Chinese | independent test context A | test context B
raw='''
adapt|v|change to suit new conditions|适应；调整|The coastal farmers had to adapt to saltier soil.|The instructor will adapt the course for beginners.
reduce|v|make something smaller in amount|减少|Better insulation can reduce the energy a house uses.|The chef will reduce the amount of sugar in the cake.
resource|n|a supply that can be used when needed|资源|Fresh water is a scarce resource on the island.|The archive is a valuable resource for local historians.
sustainable|adj|able to continue without using up natural resources|可持续的|The cooperative uses sustainable fishing methods that protect young fish.|The school wants a sustainable source of clean energy.
community|n|people living in one area or sharing an interest|社区；群体|The fishing community met to discuss the new harbour.|An online community of gardeners exchanged advice.
benefit|n|a useful or helpful result|益处|One benefit of the new schedule is a shorter commute.|Better sleep is an unexpected benefit of daily exercise.
protect|v|keep someone or something safe from harm|保护|The fence will protect the seedlings from rabbits.|The cover is designed to protect the lens from dust.
evidence|n|facts that support a belief or conclusion|证据|The muddy footprints provided evidence that someone had entered.|The committee asked for evidence before approving the claim.
significant|adj|large or important enough to deserve attention|重要的；显著的|The bridge made a significant difference to village life.|The archive contains a significant collection of early photographs.
address|v|take action to deal with a problem|处理；应对|The manager promised to address the problem of unpaid wages.|New drainage channels will address the issue of flooding.
device|n|a piece of equipment made for a purpose|设备；装置|The diver wore a device that measured water pressure.|This small device turns sunlight into electrical power.
access|n|the opportunity or right to use something|使用机会；使用权|All residents have access to the public database.|The scholarship gives students access to specialist equipment.
reliable|adj|able to be trusted to work correctly|可靠的|The clinic needs a reliable refrigerator for its vaccines.|Her careful notes are a reliable record of the meeting.
efficient|adj|working well without wasting time or energy|高效的|The new engine is more efficient and uses less fuel.|An efficient filing system made the records easy to find.
data|n|information collected for examination|数据|The team collected data on bird migration for ten years.|Researchers removed names before sharing the patient data.
privacy|n|freedom from unwanted observation or disclosure|隐私|The curtains give patients privacy during examinations.|The application asks permission before using information that affects privacy.
monitor|v|watch and check something over time|监测|The scientists will monitor the volcano for signs of activity.|Nurses monitor the patient's temperature every hour.
accurate|adj|correct and free from mistakes|准确的|The survey needs an accurate measurement of the field.|An accurate translation preserves the meaning of the original.
replace|v|put something new in the place of another thing|替换|They will replace the broken window before winter.|The museum will replace the damaged label with a new one.
innovation|n|a new idea or method put into use|创新|Drip irrigation was an important innovation for the farm.|The award recognises innovation in low-cost housing design.
approach|n|a way of dealing with a task or problem|方法|The therapist tried a different approach to the treatment.|A practical approach helped the team solve the design problem.
encourage|v|give someone support or confidence to act|鼓励|The coach tried to encourage the injured runner.|The grant will encourage young artists to exhibit their work.
assess|v|judge the quality or value of something|评估|Engineers will assess the damage before reopening the bridge.|The panel will assess each proposal against the same criteria.
feedback|n|information about how well something was done|反馈|The designer asked customers for feedback on the new handle.|Detailed feedback helped the apprentice improve her technique.
participate|v|take part in an activity|参与|Visitors can participate in a guided beach clean-up.|Employees may participate in the voluntary savings scheme.
knowledge|n|information and understanding gained by learning|知识|The guide's knowledge of local plants impressed the visitors.|The test measures practical knowledge of first aid.
develop|v|grow or make something more advanced|发展；培养|The company will develop a cheaper water filter.|Children develop coordination through active play.
individual|adj|relating to one person rather than a group|个人的；个别的|The adviser prepared an individual plan for each athlete.|Each musician received individual attention during the workshop.
method|n|a particular way of doing something|方法|The laboratory uses a new method for detecting lead in water.|This method of preserving fruit requires very little sugar.
achieve|v|succeed in reaching a goal|实现；达到|The runners trained together to achieve their target time.|The charity hopes to achieve full funding by June.
available|adj|ready to be used or obtained|可获得的；可用的|Fresh bread is available from six in the morning.|No replacement parts were available after the factory closed.
schedule|n|a plan showing when activities will happen|日程；时间表|The repair schedule lists which roads will close each week.|The train schedule changes during the winter holidays.
volunteer|n|a person who offers to work without payment|志愿者|A volunteer reads stories to children at the hospital.|Each volunteer received training before joining the rescue team.
facility|n|a building or service provided for a purpose|设施；场所|The new recycling facility can process glass and metal.|The village has a sports facility with a swimming pool.
responsibility|n|a duty to take care of something|责任|Checking the emergency exits is the caretaker's responsibility.|Parents share responsibility for collecting children after the trip.
maintain|v|keep something in good condition|维护；保持|A local mechanic will maintain the charity's delivery van.|Regular practice helps musicians maintain their skills.
balance|n|a situation in which different needs receive suitable attention|平衡|She wanted a better balance between travel and family life.|The budget seeks a balance between repairs and new construction.
support|v|give help to someone or something|支持|The grant will support families who have lost their homes.|Experienced staff support new colleagues during their first month.
organise|v|plan and arrange an activity|组织；安排|The neighbours will organise a concert to raise money.|She offered to organise transport for the visiting speakers.
opportunity|n|a chance to do something|机会|The internship is an opportunity to learn about publishing.|The storm gave the photographer an unusual opportunity.
share|v|let others use something together with you|分享；共用|The two workshops share a single delivery vehicle.|Guests can share tools instead of buying their own.
trust|n|a belief that someone is honest or dependable|信任|Years of honest reporting earned the newspaper public trust.|The partnership depends on trust between both companies.
neighbour|n|someone who lives near you|邻居|A neighbour watered the plants while the family was away.|She asked a neighbour to collect the parcel.
involve|v|include someone in an activity|使参与|The curator wants to involve local artists in the exhibition.|The council will involve residents in planning the new square.
local|adj|connected with a particular nearby area|当地的|The café buys vegetables from local farms.|The local newspaper reported the reopening of the theatre.
common|adj|shared by two or more people or groups|共同的|The two charities discovered a common interest in adult education.|The negotiators identified a common goal before discussing details.
improve|v|make something better|改善；提高|New street lights will improve safety after dark.|The editor suggested changes to improve the report.
repair|v|make a broken thing work again|修理|The watchmaker agreed to repair the old clock.|Engineers will repair the damaged section of track tonight.
belong|v|be a member or part of a group|属于；归属|New arrivals wanted to feel that they belong in the town.|The rare manuscript does not belong in this collection.
include|v|make someone or something part of a whole|包括；纳入|The menu will include several dairy-free dishes.|The final list must include the names of all contributors.
demand|n|the amount of something people want to buy or use|需求|Demand for umbrellas rose sharply during the wet spring.|The factory increased production to meet demand for bicycles.
supply|n|an amount of something available for use|供应；供给|The island's supply of fresh water depends on rainfall.|A damaged cable interrupted the electricity supply.
cost|n|the money needed to buy or do something|成本；费用|The cost of repairing the roof exceeded the estimate.|The ticket price includes the cost of the guided tour.
affordable|adj|not too expensive for people to pay for|负担得起的|The housing scheme provides affordable homes for nurses.|The village needs affordable transport for older residents.
consumer|n|someone who buys goods or services for personal use|消费者|A consumer can return a faulty product for a refund.|The survey asks each consumer about recent shopping habits.
waste|n|material that is no longer wanted|废弃物；垃圾|The laboratory separates chemical waste from ordinary rubbish.|The company turns food waste into fertiliser.
profit|n|money left after the costs of a business are paid|利润|The bakery made a small profit after paying its expenses.|Half the profit will be invested in new equipment.
investment|n|money or effort put into something for a future benefit|投资；投入|The new factory represents a major investment in the region.|Training apprentices is an investment in the company's future.
purchase|v|buy something|购买|Visitors can purchase a pass at the station.|The school will purchase instruments for the music room.
value|n|how useful or important something is|价值|The value of the archive lies in its detailed local records.|The exhibition helped residents understand the value of the wetlands.
flexible|adj|able to change to suit different needs|灵活的|The ticket offers flexible travel dates.|A flexible timetable lets carers attend evening classes.
colleague|n|a person you work with|同事|A colleague covered her shift during the emergency.|He asked a colleague to check the financial report.
task|n|a particular piece of work to be done|任务|The first task is to label every box.|Restoring the damaged painting was a difficult task.
deadline|n|the latest time by which work must be finished|截止时间|The application deadline is midnight on Friday.|The printer needs the final files before the deadline.
collaborate|v|work together on a shared activity|合作|Two universities will collaborate on the climate study.|The illustrator and poet decided to collaborate on a book.
productivity|n|the amount of work produced in a given time|生产效率|Better tools increased productivity without extending working hours.|The factory measured productivity by completed units per hour.
communicate|v|give or exchange information|沟通；传达|Divers communicate with hand signals under water.|The letter must communicate the changes clearly.
solution|n|a way to solve a problem|解决办法|A temporary bridge offered a solution to the transport problem.|The team tested a simple solution to the leaking pipe.
priority|n|something treated as more important than other things|优先事项|Restoring drinking water was the first priority after the storm.|The school made road safety a priority.
review|v|examine something again to judge or improve it|审查；重新评估|The committee will review the safety rules after the accident.|The editor will review the revised manuscript next week.
habit|n|something you do regularly and often automatically|习惯|Checking the locks before bed had become a habit.|She developed a habit of reading on the morning train.
physical|adj|relating to the body|身体的|The job requires considerable physical strength.|The doctor recommended light physical activity during recovery.
mental|adj|relating to the mind|心理的；精神的|The puzzle demands mental concentration.|Time outdoors can provide a break from mental strain.
regular|adj|happening repeatedly at similar intervals|定期的；规律的|The machine needs regular inspections every month.|Regular practice helped the singer control her breathing.
prevent|v|stop something from happening|防止|The barrier should prevent cars from entering the footpath.|Careful storage can prevent food from spoiling.
stress|n|mental pressure caused by difficult situations|压力|Uncertainty about the move caused considerable stress.|A clear work plan helped her manage stress.
recover|v|return to a normal or healthy condition|恢复|The injured bird took several weeks to recover.|The forest began to recover after the fire.
moderate|adj|neither very large nor very small in amount or intensity|适度的；中等的|The forecast predicts moderate winds rather than a storm.|The recipe needs moderate heat to avoid burning.
active|adj|spending time moving or doing things|活跃的；积极活动的|The children remained active throughout the outdoor lesson.|An active lifestyle includes walking and other regular movement.
routine|n|a usual sequence of activities|日常安排；惯例|Feeding the animals is part of the keeper's morning routine.|The baby settled into a regular bedtime routine.
destination|n|the place someone is travelling to|目的地|The ferry reached its destination before sunset.|The label shows the parcel's final destination.
route|n|a path or way from one place to another|路线|The driver chose a quieter route through the hills.|A fallen tree blocked the usual route to the village.
journey|n|an act of travelling from one place to another|旅程|The journey across the desert took three days.|Passengers were offered water during the long journey.
accommodation|n|a place to stay while away from home|住宿|The organisers arranged accommodation near the conference hall.|Accommodation on the island must be booked in advance.
explore|v|travel around or examine a place to learn about it|探索；探访|The geologists will explore the caves near the coast.|We took a narrow path to explore the old harbour.
transport|n|a system or means of moving people or goods|交通；运输|Reliable public transport helps people reach jobs.|Snow disrupted transport across the region.
delay|n|a period of waiting because something happens late|延误|A signal fault caused a twenty-minute delay.|There was a delay while officials checked the documents.
experience|n|something that happens to you and affects you|经历；体验|Sleeping under the stars was a memorable experience.|The exchange programme was her first experience of living abroad.
respect|v|show care for someone's rights or something's importance|尊重|Visitors must respect the privacy of local residents.|The agreement requires both sides to respect the boundary.
alternative|n|another available choice|替代选择|The bus is a cheaper alternative to taking a taxi.|The shortage forced engineers to find an alternative to copper.
heritage|n|traditions and historic things passed down from earlier generations|遗产；传统|The restored mill is part of the town's industrial heritage.|The festival celebrates the island's musical heritage.
preserve|v|keep something safe or in its original state|保存；保护|The archive uses special boxes to preserve old letters.|The council wants to preserve the original stone walls.
tradition|n|a custom passed from one generation to another|传统|Lighting lanterns is a winter tradition in the village.|The school maintains a tradition of welcoming former pupils.
identity|n|the qualities that make a person or group distinct|身份；认同|The neighbourhood's history is central to its identity.|Language can be an important part of cultural identity.
exhibition|n|a public display of objects or works of art|展览|The exhibition brings together photographs from six countries.|Students prepared an exhibition of handmade books.
audience|n|the people watching or listening to a performance|观众；听众|The audience remained silent during the final movement.|The speaker invited questions from the audience.
interpret|v|explain or understand the meaning of something|解读；解释|Historians interpret the letter differently because of its missing date.|The guide helped visitors interpret the symbols on the wall.
contemporary|adj|belonging to the present period|当代的|The gallery specialises in contemporary sculpture.|The course compares traditional methods with contemporary design.
original|adj|newly created rather than copied|原创的|The competition accepts only original compositions.|The designer developed an original pattern for the fabric.
record|v|store information so that it can be used later|记录|The technician will record the temperature every hour.|Researchers record interviews with the speakers' permission.
urban|adj|relating to towns or cities|城市的|Urban gardens can provide green space in crowded neighbourhoods.|The study compares urban and rural transport needs.
pedestrian|n|a person walking in a street or public place|行人|The driver stopped to let a pedestrian cross.|A pedestrian reported the broken traffic light.
traffic|n|vehicles moving on a road|交通车辆；车流|Traffic moved slowly near the construction site.|The bridge is closed to heavy traffic.
infrastructure|n|basic systems and services needed by a society|基础设施|The region needs better water infrastructure.|Investment in rail infrastructure shortened delivery times.
accessible|adj|easy for people to reach or use|易到达的；无障碍的|The lift makes the upper floor accessible to wheelchair users.|The clinic needs to be accessible by public transport.
design|n|the way something is planned and made|设计|The design of the handle makes the tool easier to grip.|The building's design allows daylight into every classroom.
public|adj|provided for or open to all people|公共的|The museum has a public reading room.|The council maintains public paths along the river.
space|n|an area that is available or can be used|空间；场地|The warehouse has enough space for the new equipment.|The children need a safe space to play outside.
connect|v|join or link things together|连接|A footbridge will connect the two riverbanks.|The new rail line will connect the airport to the city centre.
resident|n|someone who lives in a particular place|居民|Each resident received a notice about the road closure.|A long-term resident described how the village had changed.
notice|v|become aware of something by seeing or hearing it|注意到|The guard was the first to notice smoke near the door.|Did you notice the change in the bird's song?
simple|adj|easy to understand or do|简单的|The instructor gave a simple explanation of the rules.|The lock can be opened with a simple tool.
instead|adv|in place of something else|代替；转而|The lift was broken, so they used the stairs instead.|She did not buy a new coat; she repaired the old one instead.
save|v|keep money or a resource from being wasted|节省|Using a shared printer can save paper.|The shorter route will save fuel.
choose|v|decide which thing you want|选择|Customers can choose between two delivery dates.|The panel must choose one design for the new logo.
quality|n|how good or bad something is|质量|The inspector checks the quality of every batch.|The restaurant is known for the quality of its ingredients.
practical|adj|useful and suitable for a real situation|实用的；切实可行的|The workshop offers practical advice on repairing furniture.|A folding chair is a practical choice for a small balcony.
patient|adj|able to wait calmly without becoming annoyed|有耐心的|The instructor remained patient while the learner tried again.|A patient listener allowed the child to finish the story.
discover|v|find or learn something previously unknown|发现|The team hopes to discover why the lake is becoming warmer.|Archivists discover new details when they compare the letters.
confidence|n|a belief in your own ability to do something|信心|Completing the short course gave her confidence to apply.|The first successful repair increased his confidence.
'''
records=[dict(zip(['word','pos','en','zh','q1','q2'],line.split('|'))) for line in raw.strip().splitlines() if line.strip()]
assert len(records)==120
third=dict(line.split('|',1) for line in (root/'scripts/third_contexts.txt').read_text(encoding='utf8').splitlines() if line)
for r in records:r['q3']=third[r['word']]
topics=[
('环境','A small park, a different future','一座小公园的另一种未来',[
('When the river flooded, the people of Willow Lane did not begin with a grand plan. They began with a question: could an empty car park become a place that helped their community adapt to a wetter climate? A teacher brought a map, a gardener brought a notebook, and a group of children brought their observations of puddles after rain. Together, they looked for a practical way to address the problem.','河水泛滥后，柳树巷的人们没有急着制定宏大计划。他们先问：空停车场能否成为帮助社区（community）适应（adapt）更潮湿气候的地方？老师带来地图，园丁带来笔记本，孩子们带来雨后积水的观察记录。他们一起寻找处理（address）问题的可行办法。'),
('The team chose plants that could hold water in the soil and protect the riverbank. Reused bricks marked the paths. Rainwater became a resource rather than something to send quickly down a drain. The aim was to reduce flooding without making the park expensive to maintain. They called the design sustainable because it worked with local conditions instead of demanding constant supplies from elsewhere.','团队选择能保持土壤水分、保护（protect）河岸的植物，用旧砖铺路。雨水成为资源（resource），不再只是需要迅速排走的东西。目标是减少（reduce）洪水，同时控制维护费用。他们把这种顺应当地条件、无需不断从外部获取物资的设计称为可持续的（sustainable）。'),
('After the first winter, residents collected evidence: photographs taken from the same corner and notes on how long water remained. The change was significant, but they were careful about the conclusion. One mild winter could not prove that every storm would be harmless. The most immediate benefit was easier to see: neighbours now had somewhere to meet, and decisions about the river had become a shared activity.','第一个冬天后，居民收集证据（evidence）：同一角度拍摄的照片和积水持续时间的记录。变化显著（significant），但他们对结论保持谨慎：一个温和的冬季不能证明任何风暴都无害。最直接的益处（benefit）更容易看见：邻居们有了见面的地方，河流治理也成了共同参与的事。')]),
('科技','A library that listens carefully','一座谨慎使用技术的图书馆',[
('The library wanted to find out why some rooms felt uncomfortable in the afternoon. A new device could monitor temperature and light, but the librarian asked what data the team actually needed. Counting every visitor was unnecessary. The question was about the building, not about the people inside it.','图书馆想弄清一些房间下午不舒适的原因。新设备（device）可以监测（monitor）温度和光照，但馆员先询问真正需要哪些数据（data）。没有必要统计每位访客，因为研究对象是建筑而非里面的人。'),
('The team placed sensors near windows and compared their readings with a reliable hand-held thermometer. Accurate results mattered more than a colourful display. They also explained how the system protected privacy: no names, photographs, or personal reading records were collected. Everyone could have access to a simple summary on the noticeboard.','团队把传感器放在窗边，并用可靠的（reliable）手持温度计对照。准确的（accurate）结果比漂亮图表更重要。他们也说明隐私（privacy）保护方式：不采集姓名、照片和个人阅读记录。每个人都能获得（access）公告栏上的简单汇总。'),
('The answer was surprisingly ordinary. Moving two blinds made the rooms more efficient to cool. There was no need to replace all the windows. The librarian described the project as a useful innovation, not because the equipment was unusual, but because it helped people ask a clear question and test a modest answer.','答案出奇平常：调整两处百叶窗就能让降温更高效（efficient），无需替换（replace）所有窗户。馆员称之为有用的创新（innovation），不是因为设备奇特，而是它帮助大家提出明确的问题并验证一个小改动。')]),
('教育','Learning to ask a better question','学会提出更好的问题',[
('At the evening school, a teacher changed her approach to homework. Instead of asking every learner to copy a page, she asked each person to bring one question from daily life. A bus timetable, a food label, and a rental notice became material for the next lesson. She wanted to encourage curiosity rather than reward fast copying.','夜校老师改变了布置作业的方法（approach）。她让学生带来日常生活中的一个问题，而不是抄写一页纸。公交时刻表、食品标签和租房通知成为下一课的材料。她希望鼓励（encourage）好奇心，而不是奖励抄写速度。'),
('Learners worked in pairs to develop an explanation that another person could use. Everyone had a chance to participate, and an individual difficulty could become a shared investigation. The teacher used short conversations to assess understanding. Her feedback pointed to a specific next step rather than simply giving a score.','学生两人一组，发展（develop）出别人也能用的解释。每个人都有参与（participate）的机会，个别的（individual）困难可以成为共同探索的问题。老师通过简短交谈评估（assess）理解，反馈（feedback）指向具体的下一步，而不只是给分。'),
('This method did not remove the need for knowledge. Learners still checked words and practised calculations. It changed what they did with that knowledge. By the end of the month, they could explain a notice to a neighbour and compare two travel options. To achieve something useful, they had learned to notice exactly what they did not yet understand.','这种方法（method）没有消除对知识（knowledge）的需要，学生仍需查词和练习计算。它改变的是运用知识的方式。月底，他们能向邻居解释通知、比较出行方案。为了实现（achieve）有用的目标，他们学会辨认自己还不理解的地方。')]),
('校园','The shared kitchen experiment','共享厨房的小实验',[
('A student volunteer found that the campus kitchen was often empty, even though many students wanted to cook. The facility was available, but the booking schedule was difficult to understand. A long set of rules made a simple meal feel like an examination.','一位学生志愿者（volunteer）发现校园厨房常常空着，尽管很多学生想做饭。设施（facility）可以使用（available），但预约日程（schedule）难以理解，冗长规则让做顿饭仿佛参加考试。'),
("Students agreed to organise a short introduction every Friday. They explained how to use the equipment and support people cooking their first meal away from home. Cleaning remained everyone's responsibility. The group wanted a balance between a welcoming atmosphere and a space that would stay safe and tidy.",'学生们决定每周五组织（organise）简短介绍，讲解设备使用并支持（support）第一次离家做饭的人。清洁仍是每个人的责任（responsibility）。他们希望在友好氛围和整洁安全之间找到平衡（balance）。'),
('A notebook beside the door recorded damaged tools so that staff could maintain them promptly. The kitchen became an opportunity to meet people from other courses. Nobody claimed the project had solved every problem of campus life. It had made one useful room easier to share, and that was a worthwhile beginning.','门边笔记本记录损坏的工具，便于工作人员及时维护（maintain）。厨房成了结识其他专业同学的机会（opportunity）。没人宣称它解决了校园生活所有问题，它只是让一个有用的房间更便于共享，而这就是有价值的开始。')]),
('社会','One drill, many front doors','一把电钻，许多家门',[
('Mina needed a drill for twenty minutes, not for the rest of her life. A neighbour offered to share one. Their conversation led to a small tool library in the local community hall. People could repair a shelf or hang a picture without buying equipment they would rarely use.','米娜只需要用二十分钟电钻，不需要终生拥有它。邻居（neighbour）愿意共用（share）一把。这次交谈促成了当地的（local）社区工具库，让大家不必为偶尔修理（repair）架子或挂画而购买设备。'),
('Trust mattered, but so did a clear system. Every tool had a label and a return date. The organisers tried to involve people who had never joined a community activity before. Instructions used short sentences, and the first visit did not require a long online form.','信任（trust）很重要，清楚的制度也一样。每件工具都有标签和归还日期。组织者努力使从未参加社区活动的人也能参与（involve）。说明使用短句，初次借用不要求填写冗长的线上表格。'),
('The group had a common purpose: to improve access to useful things. They decided to include basic sewing equipment as well as heavy tools. Over time, visitors came for advice as often as for a drill. The library gave new residents a small but concrete reason to feel that they belong.','大家有共同的（common）目标：改善（improve）有用物品的获取机会。他们决定纳入（include）基本缝纫器材。渐渐地，人们来咨询建议的次数与借电钻一样多。工具库让新居民有了具体的归属感（belong）。')]),
('经济','The price of an empty bottle','一个空瓶子的价格',[
('A small refill shop opened beside the market. Each consumer could bring a bottle and purchase only the soap they needed. Demand was uncertain at first. Some customers liked the idea but worried that an environmentally friendly choice would never be affordable.','市场旁开了一家小型补充装商店。每位消费者（consumer）能带瓶子来，只购买（purchase）所需的肥皂。最初需求（demand）不确定，有些人喜欢这个想法，却担心环保选择的价格难以负担（affordable）。'),
('The owner displayed the cost per litre beside every container. She explained that a steady supply mattered more than stocking dozens of brands. Less packaging meant less waste, but cleaning the containers still took time. The lower price did not appear by magic; it came from a different way of organising the work.','店主在每个容器旁标明每升成本（cost），说明稳定供应（supply）比储备几十个品牌更重要。包装减少带来更少废弃物（waste），但清洗容器仍需时间。较低价格来自工作方式的变化。'),
("For the first year, profit was small. An investment in better scales helped customers check exactly what they were buying. Some returned because the system saved money; others valued the conversation about ingredients. The shop's value depended on both trust and careful arithmetic.",'第一年利润（profit）不高。对更好秤具的投资（investment）让顾客能核查购买数量。有些人为省钱回来，另一些人看重关于成分的交流。商店的价值（value）既依赖信任，也依赖仔细计算。')]),
('职场','A meeting with an empty chair','一场留出空位的会议',[
('When a colleague asked for flexible working hours, the design team realised that its meetings were harder to change than its actual work. A parent missed the morning discussion every Tuesday. The team decided to review the routine rather than ask one person to keep making apologies.','当同事（colleague）提出灵活的（flexible）工时需求时，设计团队发现会议比工作本身更难调整。一位家长每周二错过晨会。团队决定重新评估（review）惯例，而不是让同一个人不断道歉。'),
('Each task needed an owner, a clear deadline, and a written note explaining the next decision. People could collaborate without all being present at the same moment. They still met when a conversation was the best way to communicate, but a meeting was no longer the automatic answer to every question.','每项任务（task）需要负责人、明确截止时间（deadline）和说明下一决策的笔记。大家可以不同步在场而合作（collaborate）。适合交谈时仍开会，但会议不再是所有问题默认的沟通（communicate）方式。'),
('The priority was reliable work, not a dramatic claim about productivity. The team tried the change for a month and discussed what had become easier or harder. Their solution was imperfect: urgent decisions still needed a quick call. Yet the empty chair no longer meant that its owner had been left out.','优先事项（priority）是可靠地完成工作，而不是夸大生产效率（productivity）。团队试行一个月，讨论改善和困难。解决办法（solution）并不完美，紧急决策仍需快速通话；但空椅子不再意味着有人被排除。')]),
('健康','The walk after lunch','午饭后的散步',[
('After moving to a desk job, Arun noticed that his daily routine included very little movement. He began a short walk after lunch. He did not set a distance record or buy new equipment. The aim was a regular habit that would fit an ordinary working day.','阿伦换到办公室工作后发现日常安排（routine）很少包含运动。他开始午饭后短途散步，不追求距离纪录，也不买新装备，只希望建立能融入普通工作日的规律（regular）习惯（habit）。'),
('A colleague joined him, and their route passed a small garden. The physical activity was moderate: they could still talk comfortably. They found that a break from screens also gave them some mental space. On a difficult afternoon, the walk was a chance to step away from stress rather than an attempt to solve everything at once.','同事加入后，他们的路线经过小花园。身体（physical）活动强度适度（moderate），能轻松交谈。离开屏幕也给心理（mental）留出空间。困难的下午，散步让他们暂时放下压力（stress），而非试图一次解决一切。'),
('Arun stayed active in small ways, taking the stairs when it suited him and resting when he needed to recover. He did not claim that walking could prevent every illness. Personal health needs differ, and the story was not medical advice. For him, a manageable change was more useful than an ambitious plan abandoned after a week.','阿伦通过适合自己的方式保持活动（active），需要恢复（recover）时就休息。他没有声称散步能预防（prevent）所有疾病。个人健康需求不同，这个故事不是医疗建议。对他而言，可持续的小改变比一周后放弃的宏大计划更有用。')]),
('旅行','The bus beyond the postcard','明信片之外的公交车',[
('Leah chose a small coastal town as her destination. Her journey began with a delayed train and an unfamiliar bus route. Instead of treating the delay as a ruined morning, she asked the station assistant about an alternative. A local bus followed the harbour and stopped near her accommodation.','莉娅选择海边小镇作为目的地（destination）。旅程（journey）始于晚点列车和陌生公交路线（route）。她向站务员询问替代选择（alternative），当地公交沿港口行驶，停在住宿（accommodation）附近。她没有把延误（delay）当作一上午彻底泡汤。'),
('Public transport changed what she noticed. She saw workers buying breakfast and children carrying sports bags. Later, she set out to explore the streets beyond the main square. The most interesting experience was not a famous viewpoint but a conversation with a bookseller about the changing fishing season.','公共交通（transport）改变了她的观察：工人买早餐，孩子背运动包。之后她去探访（explore）广场之外的街道。最有趣的经历（experience）不是著名观景点，而是与书商讨论渔季的变化。'),
("Before taking a photograph, she asked permission. To respect a place meant recognising that it was someone's everyday home. She left without a perfect itinerary, but with a better understanding of why the town looked and worked as it did. The slower route had not merely filled time; it had changed the visit.",'拍照前，她先征求许可。尊重（respect）一个地方，意味着明白那里是别人的日常家园。她离开时没有完美行程，却更理解小镇的面貌和运转。较慢的路线改变了整次访问。')]),
('文化','Whose story is in the museum?','博物馆里是谁的故事',[
('The town museum planned an exhibition about the old textile mill. To preserve its heritage, the curator did more than collect machines. She invited former workers to record their memories, including stories that disagreed. A building could survive while the everyday knowledge of its users disappeared.','小镇博物馆筹备纺织厂展览（exhibition）。为保存（preserve）遗产（heritage），策展人不仅收集机器，还邀请退休工人记录（record）记忆，包括彼此不同的故事。建筑可以留存，使用者的日常知识却可能消失。'),
('An original cloth pattern stood beside a contemporary photograph of the site. Visitors could interpret the objects through sound recordings as well as written labels. The curator did not present every tradition as unchanged. Workers described how tools, schedules, and family life had shifted over time.','原创的（original）布样旁放着厂址的当代（contemporary）照片。访客可通过录音和文字解读（interpret）物品。策展人没有把所有传统（tradition）描述为一成不变；工人们讲述工具、日程和家庭生活如何变化。'),
("The audience included people who had worked in the mill and children who knew it only as an empty building. Their questions made the museum reconsider the town's identity. The exhibition offered a place for different accounts to meet, not a final story that everyone had to repeat.",'观众（audience）既有老工人，也有只见过空厂房的孩子。他们的问题让博物馆重新思考小镇认同（identity）。展览让不同叙述相遇，而非要求所有人重复一个定论。')]),
('城市','A street with room to pause','一条可以停留的街道',[
('The urban planning team watched the street before drawing a new design. Traffic moved quickly, but a pedestrian using a walking frame needed more time to cross. A resident pointed out that the shortest route to the public clinic had no place to sit. The map showed connections that did not work equally well for everyone.','城市（urban）规划团队先观察街道，再做设计（design）。车流（traffic）很快，但使用助行架的行人（pedestrian）需要更多过街时间。居民（resident）指出去公共（public）诊所的最短路线没有座椅。地图上的连接并不对所有人同样好用。'),
('New infrastructure did not have to mean a large road. The plan used a wider crossing, a few benches, and a small change to the bus stop. The aim was to make the area accessible and connect useful places safely. Shopkeepers worried about deliveries, so the team tested the layout with temporary markings.','新的基础设施（infrastructure）不一定是大路。方案包括更宽的人行横道、座椅和公交站小调整，旨在提升无障碍性（accessible），安全连接（connect）常用地点。店主担心送货，团队先用临时标线测试。'),
('People used the extra space in different ways. Some waited for a friend; others stopped on the way home. The team counted crossings and listened to complaints before making the arrangement permanent. A successful street was not simply one that looked attractive in a drawing. It had to work during an ordinary wet Tuesday.','大家以不同方式使用增加的空间（space）：等朋友或回家途中歇脚。团队统计过街次数并听取投诉，之后才永久实施。成功街道不只是图纸好看，还要在普通的雨天周二运转良好。')]),
('日常生活','Before buying another kettle','买下一只水壶之前',[
('When the kettle stopped working, Noor almost ordered a replacement immediately. Then she began to notice how many broken things were waiting in her cupboard. She decided to choose one simple repair before buying anything new. A community workshop offered practical help with small household objects.','水壶坏掉时，努尔差点立刻下单。随后她注意到（notice）柜中许多坏东西，决定选择（choose）一个简单的（simple）修理再买新东西。社区工坊为小型家居物品提供实用的（practical）帮助。'),
('The volunteer checked the unplugged kettle and explained that electrical repairs required suitable training. Noor worked on a loose handle instead. She had to be patient while learning how the parts fitted together. The quality of the repair mattered more than finishing quickly, and the volunteer let her do the safe steps herself.','志愿者检查拔掉插头的水壶，解释电器维修需要合适培训。努尔转而（instead）修松动手柄。她耐心地（patient）学习零件配合，修理质量（quality）比速度重要。志愿者让她亲自完成安全的步骤。'),
('The visit did not save a large amount of money. It helped her discover which jobs she could do and which needed a professional. That distinction gave her confidence to ask better questions the next time something failed. She left with a working handle and a less automatic response to the idea of throwing things away.','这次没有节省（save）很多钱，却帮助她发现（discover）哪些工作能自己做、哪些需要专业人员。这一区别给她信心（confidence），下次物品损坏时能提出更好的问题。她带着修好的手柄离开，也不再下意识地丢弃物品。')])]
dictionary=load('dictionary.json');index={}
for l in dictionary:index.setdefault(l['lemma'].lower(),[]).append(l)
for r in records:
    word=r['word'];ls=index.get(word,[])
    if ls:l=ls[0]
    else:l={'id':'cf-l-'+word,'lemma':word,'ipa':{},'senses':[]};dictionary.append(l);index[word]=[l]
    sid='s-'+word+('-deal' if word=='address' else '-main')
    r['sid']=sid;r['lexemeId']=l['id']
    l['senses'].insert(0,{'id':sid,'pos':r['pos'],'en':r['en'],'zh':r['zh'],'source':'contextflow-original','status':'模型编写或修订 · 未独立语言审阅'})
# Keep the statistical sense separate; the ordinary sense must not absorb it.
index['significant'][0]['senses'].insert(1,{'id':'s-significant-stat','pos':'adj','en':'unlikely to be explained by chance under a specified statistical test','zh':'（统计学）显著的','source':'contextflow-original','status':'模型编写 · 未独立语言审阅','domain':'统计学','collocations':['statistically significant']})
questions=[]
for ri,r in enumerate(records):
    # Distractors are different concepts, chosen within part of speech when possible.
    pool=[x for x in records if x['word']!=r['word'] and x['pos']==r['pos'] and x['en']!=r['en']]
    if len(pool)<3:pool=[x for x in records if x['word']!=r['word']]
    for n in range(3):
        ds=[pool[(ri*7+n*3+j*11)%len(pool)] for j in range(3)]
        if len({x['en'] for x in ds})<3:ds=pool[:3]
        options=[r]+ds;shift=(ri+n)%4;options=options[shift:]+options[:shift]
        questions.append({'id':f'q-{r["word"]}-{n+1}','version':'1','senseId':r['sid'],'word':r['word'],'context':r[f'q{n+1}'],'prompt':f'What does “{r["word"]}” mean in this sentence?','options':[x['en'] for x in options],'answer':next(i for i,x in enumerate(options) if x is r),'explanations':[(f'正确。这里的 {r["word"]} 表示“{r["zh"]}”，符合句中的动作或描述。' if x is r else f'此项表示“{x["zh"]}”（通常对应 {x["word"]}），不符合本句 {r["word"]} 的含义。') for x in options],'contextId':f'ctx-{r["word"]}-{n+1}','type':'跨语境词义理解'})
articles=[]
for ti,(topic,title,subtitle,paras) in enumerate(topics):
    targets=[{'word':r['word'],'senseId':r['sid']} for r in records[ti*10:(ti+1)*10]]
    for mi,mode in enumerate(['CET-4','CET-6','IELTS']):
        # Transparent reading editions: no new-article or exam-level calibration claims.
        n=(ti+mi)%3
        extra=[]
        if n>=1:extra.append(('The people involved kept a short record of what happened next. They separated what they had observed from what they merely expected. This mattered because an appealing idea can succeed in one setting and fail in another. A useful question was not just whether the change worked, but for whom it worked, under what conditions, and at what cost. Their notes included small inconveniences as well as encouraging results.','参与者简短记录后续情况，区分观察事实和预期。一个好想法可能在某处成功，在另一处失败。问题不仅是改变是否奏效，还包括对谁、在什么条件下、以何种代价奏效。记录既包含积极结果，也包含不便。'))
        if n>=2:extra.append(('There was another difficulty: people did not always agree about what should count as success. One person wanted a quick result, while another wanted a system that would still be useful several years later. Rather than hide the disagreement, they wrote down the different goals. This made the next discussion more precise. They could change a detail without pretending that everyone had wanted exactly the same thing from the beginning.','另一个困难是成功的标准并不一致：有人追求快速结果，有人希望系统多年后仍有用。他们把不同目标写下来，而非掩盖分歧。之后的讨论更准确，也能调整细节，无需假装所有人一开始的愿望都相同。'))
        chosen=paras if mi==0 else [more[ti][mi-1]]
        p=[{'en':a,'zh':b} for a,b in chosen+extra]
        wc=len(re.findall(r"\b[\w'-]+\b",' '.join(x['en'] for x in p)))
        length=['短篇','中篇','长篇'][n]
        more_titles=[['The refill point by the boats','A lesson hidden in a leaking pipe'],['A warning light at the clinic','The museum ticket question'],['One wheel, one useful question','The quiet members of a language club'],['A room for repairing clothes','The key to a locked study room'],['A letter on the community table','Breakfast in a shared courtyard'],['The imperfect vegetable stall','A book worth repairing'],['Where did that decision go?','Who takes the urgent job?'],['A pause in the choir rehearsal','A calmer morning at the bakery'],['The route on an unused ticket','A map with an unexpected bus'],['The stories behind a festival poster','The bridge between memory and theatre'],['Open space, usable space','A safer route between two schools'],['A gift that leaves room','Before ordering another shelf']]
        article_title=title if mi==0 else more_titles[ti][mi-1]
        articles.append({'id':f'article-{ti+1}-{mi+1}','version':'1','title':article_title,'subtitle':subtitle,'topic':topic,'mode':mode,'length':length,'wordCount':wc,'paragraphs':p,'targets':targets,'questionIds':[f'q-{r["word"]}-{j}' for r in records[ti*10:(ti+1)*10] for j in [1,2,3]],'source':'ContextFlow 原创学习草稿；考试分组未经难度标定'})
forms={'went':['go'],'gone':['go'],'children':['child'],'studies':['study'],'studied':['study'],'running':['run'],'ran':['run'],'saw':['saw','see'],'seen':['see'],'leaves':['leaf','leave'],'left':['leave','left'],'better':['good','well','better'],'best':['good','well'],'people':['person','people'],'men':['man'],'women':['woman'],'mice':['mouse'],'teeth':['tooth'],'feet':['foot'],'bought':['buy'],'brought':['bring'],'thought':['think'],'taught':['teach'],'made':['make'],'took':['take'],'taken':['take'],'wrote':['write'],'written':['write'],'was':['be'],'were':['be'],'is':['be'],'are':['be'],'has':['have'],'had':['have'],'did':['do'],'done':['do'],'organize':['organise'],'organized':['organise'],'organizing':['organise']}
for row in json.loads((pathlib.Path(__file__).parent/'phrase-supplements.json').read_text(encoding='utf8')):
    if not any(x['id']==row['id'] for x in dictionary):dictionary.append(row)
write('dictionary.json',dictionary);write('content.json',{'articles':articles,'questions':questions,'forms':forms});write('forms.json',forms)
manifest=load('manifest.json');manifest['headwords']=len(dictionary);manifest['coverage'].update({'originalTopicStories':36,'readingEditions':36,'uniqueQuestions':len(questions),'originalLearnerSenses':121,'independentLexemeReview':0,'independentContextReview':0,'ieltsValidated':0});write('manifest.json',manifest)
write('sample-learning-bundle.json',{'format':'ContextFlowLearningBundle','version':1,'articles':[articles[0]],'questions':[q for q in questions if q['id'] in articles[0]['questionIds']]})
print(json.dumps(manifest['coverage'],ensure_ascii=False))
