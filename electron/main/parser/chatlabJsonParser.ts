/**
 * ChatLab 专属 JSON 格式解析器
 * 支持 ChatLab 工具导出的统一格式
 */

import type { ChatParser } from './types'
import {
  ChatPlatform,
  ChatType,
  type ParseResult,
  type ParsedMember,
  type ParsedMessage,
  type ChatLabFormat,
} from '../../../src/types/chat'

/**
 * ChatLab JSON 格式解析器
 */
export const chatlabJsonParser: ChatParser = {
  name: 'ChatLab JSON',
  platform: 'chatlab',

  detect(content: string, filename: string): boolean {
    // 检查文件扩展名
    if (!filename.toLowerCase().endsWith('.json') && !filename.toLowerCase().endsWith('.chatlab.json')) {
      return false
    }

    try {
      const data = JSON.parse(content)
      // 检查是否有 ChatLab 格式特征
      return (
        data.chatlab &&
        typeof data.chatlab.version === 'string' &&
        data.meta &&
        Array.isArray(data.members) &&
        Array.isArray(data.messages)
      )
    } catch {
      return false
    }
  },

  parse(content: string, _filename: string): ParseResult {
    let data: ChatLabFormat
    try {
      data = JSON.parse(content)
    } catch (e) {
      throw new Error(`JSON 解析失败: ${e}`)
    }

    if (!data.chatlab || !data.meta || !Array.isArray(data.messages)) {
      throw new Error('无效的 ChatLab JSON 格式')
    }

    // 解析元信息
    const meta = {
      name: data.meta.name,
      platform: (data.meta.platform as ChatPlatform) || ChatPlatform.UNKNOWN,
      type: (data.meta.type as ChatType) || ChatType.GROUP,
    }

    // 解析成员
    const members: ParsedMember[] = data.members.map((m) => ({
      platformId: m.platformId,
      name: m.name,
    }))

    // 解析消息
    const messages: ParsedMessage[] = data.messages.map((msg) => ({
      senderPlatformId: msg.sender,
      senderName: msg.name,
      timestamp: msg.timestamp,
      type: msg.type,
      content: msg.content,
    }))

    return {
      meta,
      members,
      messages,
    }
  },
}
