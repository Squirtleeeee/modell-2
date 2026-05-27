import { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Typography, Empty, Spin } from 'antd';
import { SendOutlined, MessageOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { fetchContacts, fetchMessages, sendMessage } from '../../api';
import { useSocket } from '../../hooks/useSocket';
import { useIsMobile } from '../../hooks/useMediaQuery';

const { Text, Title } = Typography;

interface Contact {
  contact_id: number;
  username: string;
  last_msg: string;
  last_time: string;
}

interface Msg {
  id: number;
  from_user_id: number;
  to_user_id: number;
  content: string;
  from_username: string;
  created_at: string;
}

export default function Messages() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { join, on, sendMessage: wsSend } = useSocket();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const msgEndRef = useRef<HTMLDivElement>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (user) join(user.id);
  }, [user]);

  // 加载联系人
  useEffect(() => {
    fetchContacts().then(setContacts).finally(() => setLoading(false));
  }, []);

  // 监听新消息
  useEffect(() => {
    return on('new_message', (data: unknown) => {
      const msg = data as Msg;
      setMessages((prev) => [...prev, msg]);
      // 刷新联系人列表
      fetchContacts().then(setContacts);
    });
  }, [on]);

  // 加载对话
  useEffect(() => {
    if (!selectedContact) return;
    fetchMessages(selectedContact.contact_id).then((list) => {
      setMessages(list as Msg[]);
      setShowChat(true);
    });
  }, [selectedContact]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedContact) return;
    const content = input.trim();
    setInput('');
    try {
      await sendMessage(selectedContact.contact_id, content);
      wsSend(selectedContact.contact_id, content);
    } catch {
      // ignore
    }
  };

  const contactList = (
    <div style={{ flex: isMobile ? 1 : '0 0 280px', borderRight: isMobile ? 'none' : '1px solid #E8E0D8', overflow: 'auto' }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : contacts.length === 0 ? (
        <Empty description="暂无联系人" style={{ padding: 40 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={contacts}
          renderItem={(c) => (
            <div
              onClick={() => setSelectedContact(c)}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedContact?.contact_id === c.contact_id ? '#FFF1EE' : '#fff',
                borderBottom: '1px solid #F5F0EC',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4DB6AC' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Text strong>{c.username}</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }} ellipsis>{c.last_msg || '暂无消息'}</Text>
              </div>
              {c.last_time && <Text type="secondary" style={{ fontSize: 11 }}>{c.last_time.slice(11, 16)}</Text>}
            </div>
          )}
        />
      )}
    </div>
  );

  const chatWindow = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: isMobile ? 'calc(100% - 48px)' : '100%' }}>
      {isMobile && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #E8E0D8', background: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" onClick={() => setShowChat(false)}>← 返回</Button>
          <Text strong>{selectedContact?.username}</Text>
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {messages.length === 0 ? (
          <Empty description="暂无消息，发送第一条吧" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          messages.map((m) => {
            const isMe = m.from_user_id === user?.id;
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                <div style={{ maxWidth: '70%' }}>
                  {!isMe && <Text type="secondary" style={{ fontSize: 11 }}>{m.from_username}</Text>}
                  <div style={{
                    padding: '8px 14px',
                    borderRadius: 12,
                    background: isMe ? '#E8725A' : '#fff',
                    color: isMe ? '#fff' : '#3D322C',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    wordBreak: 'break-all',
                  }}>
                    {m.content}
                  </div>
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', textAlign: isMe ? 'right' : 'left', marginTop: 2 }}>
                    {m.created_at?.slice(11, 16)}
                  </Text>
                </div>
              </div>
            );
          })
        )}
        <div ref={msgEndRef} />
      </div>
      {selectedContact && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #E8E0D8', background: '#fff', display: 'flex', gap: 8 }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="输入消息..."
            style={{ borderRadius: 20 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ borderRadius: 20, background: '#E8725A' }} />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ height: 'calc(100vh - 140px)', display: 'flex', flexDirection: 'column' }}>
        <Title level={5} style={{ margin: 0, padding: '0 0 12px' }}>
          <MessageOutlined /> 消息
        </Title>
        {showChat && selectedContact ? chatWindow : contactList}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 120px)', background: '#fff', borderRadius: 10, overflow: 'hidden' }}>
      {contactList}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selectedContact ? (
          chatWindow
        ) : (
          <Empty description="选择一个联系人开始聊天" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </div>
    </div>
  );
}
