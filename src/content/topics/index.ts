import { researchTopics } from './research'
import { earthTopics } from './earth'
import { matterTopics } from './matter'
import { lifeTopics } from './life'
import { energyTopics } from './energy'
import { ecologyTopics } from './ecology'

export const topics = [
  ...researchTopics,
  ...earthTopics,
  ...matterTopics,
  ...lifeTopics,
  ...energyTopics,
  ...ecologyTopics,
]

export const topicById = Object.fromEntries(topics.map((topic) => [topic.id, topic]))
