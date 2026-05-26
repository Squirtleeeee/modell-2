import { useState, useEffect, useRef } from 'react';
import { Input, Button, List, Avatar, Empty, Spin, Typography } from 'antd';
import { SendOutlined, MessageOutlined, UserOutlined, LeftOutlined } from '@ant-design/icons';
import { useAuth } from '../../context/AuthContext';
import { fetchContacts, fetchMessages, sendMessage } from '../../api';
import { useSocket } from '../../hooks/useSocket';

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
  const { join, on, sendMessage: wsSend } = useSocket();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) join(user.id);
  }, [user]);

  useEffect(() => {
    fetchContacts().then(setContacts).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return on('new_message', (data: unknown) => {
      const msg = data as Msg;
      setMessages((prev) => [...prev, msg]);
      fetchContacts().then(setContacts);
    });
  }, [on]);

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

  if (showChat && selectedContact) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '10px 12px', borderBottom: '1px solid #E8E0D8', background: '#fff',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Button type="text" icon={<LeftOutlined />} onClick={() => { setShowChat(false); setSelectedContact(null); }} />
          <Text strong>{selectedContact.username}</Text>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
          {messages.length === 0 ? (
            <Empty description="暂无消息" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            messages.map((m) => {
              const isMe = m.from_user_id === user?.id;
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                  <div style={{ maxWidth: '75%' }}>
                    {!isMe && <Text type="secondary" style={{ fontSize: 11 }}>{m.from_username}</Text>}
                    <div style={{
                      padding: '7px 12px', borderRadius: 12,
                      background: isMe ? '#E8725A' : '#fff',
                      color: isMe ? '#fff' : '#3D322C',
                      wordBreak: 'break-all', fontSize: 14,
                    }}>{m.content}</div>
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
        <div style={{ padding: '8px 10px', borderTop: '1px solid #E8E0D8', background: '#fff', display: 'flex', gap: 6 }}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={handleSend}
            placeholder="输入消息..."
            style={{ borderRadius: 20, height: 38 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
            style={{ borderRadius: 20, background: '#E8725A', border: 'none', height: 38, width: 38 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Title level={5} style={{ margin: 0, paddingBottom: 8 }}>
        <MessageOutlined /> 消息
      </Title>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : contacts.length === 0 ? (
        <Empty description="暂无联系人" style={{ padding: 20 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={contacts}
          renderItem={(c) => (
            <div
              onClick={() => setSelectedContact(c)}
              style={{
                padding: '10px 12px', cursor: 'pointer', background: '#fff',
                borderRadius: 8, marginBottom: 6,
                display: 'flex', alignItems: 'center', gap: 8,
                border: '1px solid #E8E0D8',
              }}
            >
              <Avatar icon={<UserOutlined />} size={40} style={{ backgroundColor: '#4DB6AC' }} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Text strong style={{ fontSize: 14 }}>{c.username}</Text>
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
}
