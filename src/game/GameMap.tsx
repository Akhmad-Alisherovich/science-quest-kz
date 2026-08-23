import { sections } from '../content/sections'
import { topicLevels } from '../content/levels'
import { topics } from '../content/topics'
import { ui } from '../content/ui'
import { useGame } from '../store/GameStore'
import { useLearning } from '../store/LearningStore'

export function GameMap({ onOpenLevel, onOpenBoss, adminMode = false }: { onOpenLevel: (id: string) => void; onOpenBoss: (sectionId: string) => void; adminMode?: boolean }) {
  const { progress, isTopicUnlocked, isLevelUnlocked, isBossUnlocked } = useGame()
  const { available, getAccess } = useLearning()
  const copy = ui(progress.language)
  const openTopic = (topicId: string) => {
    const levelList = topicLevels(topicId)
    const next = levelList.find((level) => {
      const server = getAccess('level', level.id)
      return adminMode || (!progress.completedLevels.includes(level.id) && (available ? server != null && !['locked', 'hidden'].includes(server.accessState) : isLevelUnlocked(level.id)))
    }) ?? levelList[levelList.length - 1]
    onOpenLevel(next.id)
  }
  return <main className="map-page">
    <section className="map-intro"><div><span className="eyebrow">SCIENCE QUEST KZ</span><h1>{copy.allZones}</h1><p>{progress.language === 'kk' ? 'Жарқыраған бағытпен жүр. Әр аймақ ғылыми миссиямен аяқталады.' : 'Следуй по светящемуся маршруту. Каждая территория завершается научной миссией.'}</p></div><div className="map-summary"><span>{progress.completedLevels.length}/92</span><small>{copy.completed}</small></div></section>
    <div className="map-route">
      {sections.map((section, sectionIndex) => {
        const sectionAccess = getAccess('section', section.id)
        if (!adminMode && available && sectionAccess?.accessState === 'hidden') return null
        const sectionTopics = topics.filter((topic) => topic.sectionId === section.id)
        const bossAccess = getAccess('boss', `boss:${section.id}`)
        const bossUnlocked = adminMode || (available ? bossAccess != null && !['locked', 'hidden'].includes(bossAccess.accessState) : isBossUnlocked(section.id))
        const bossDone = progress.completedBosses.includes(section.id)
        return <section key={section.id} className="zone" style={{ '--zone-color': section.color } as React.CSSProperties}>
          <div className="zone-heading"><span className="zone-number">0{sectionIndex + 1}</span><span className="zone-icon">{section.icon}</span><div><h2>{section.title[progress.language]}</h2><p>{section.description[progress.language]}</p></div></div>
          <div className="topic-path">
            {sectionTopics.map((topic, topicIndex) => {
              const topicAccess = getAccess('topic', topic.id)
              if (!adminMode && available && topicAccess?.accessState === 'hidden') return null
              const unlocked = adminMode || (available ? topicAccess != null && !['locked', 'hidden'].includes(topicAccess.accessState) : isTopicUnlocked(topic.id))
              const complete = progress.completedLevels.includes(`${topic.id}-challenge`)
              const assigned = topicAccess?.accessState === 'assigned'
              const levelList = topicLevels(topic.id)
              const stars = levelList.reduce((sum, level) => sum + (progress.levelStars[level.id] ?? 0), 0)
              return <div className="path-segment" key={topic.id}>
                <div className={adminMode ? 'admin-topic-stack' : undefined}>
                  <button disabled={!unlocked} className={`topic-node ${complete ? 'complete' : unlocked ? 'current' : 'locked'}`} onClick={() => openTopic(topic.id)}>
                    <span className="node-status">{complete ? '✓' : assigned ? '📌' : unlocked ? '✦' : '🔒'}</span><span className="node-icon">{topic.icon}</span><span className="node-copy"><strong>{topic.title[progress.language]}</strong><small>{adminMode ? 'ADMIN OPEN' : complete ? `${stars}/12 ⭐` : assigned ? (progress.language === 'kk' ? 'Тағайындалды' : 'Назначено') : unlocked ? copy.current : copy.locked}</small></span>
                  </button>
                  {adminMode && <div className="admin-level-picker" aria-label={progress.language === 'kk' ? 'Тақырып деңгейлері' : 'Уровни темы'}>{levelList.map((level) => <button key={level.id} onClick={() => onOpenLevel(level.id)}><span>{level.difficulty}</span><strong>{level.title[progress.language]}</strong></button>)}</div>}
                </div>{topicIndex < sectionTopics.length - 1 && <div className={`route-line ${complete ? 'lit' : ''}`}><i /></div>}
              </div>
            })}
            {(adminMode || bossAccess?.accessState !== 'hidden') && <div className="path-segment"><div className={`route-line ${bossUnlocked ? 'lit' : ''}`}><i /></div><button disabled={!bossUnlocked} className={`boss-node ${bossDone ? 'complete' : bossUnlocked ? 'current' : 'locked'}`} onClick={() => onOpenBoss(section.id)}><span>🔥</span><div><small>{adminMode ? 'ADMIN OPEN' : bossAccess?.accessState === 'assigned' ? (progress.language === 'kk' ? 'ТАҒАЙЫНДАЛДЫ' : 'НАЗНАЧЕНО') : copy.boss}</small><strong>{section.bossTitle[progress.language]}</strong></div><b>{bossDone ? '✓' : bossUnlocked ? '→' : '🔒'}</b></button></div>}
          </div>
        </section>
      })}
    </div>
  </main>
}
