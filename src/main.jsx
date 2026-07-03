import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BellRing, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react';
import './styles.css';

const MAX_HOURS = 99;

function clamp(value, min, max) {
  const number = Number.parseInt(value || '0', 10);
  return Math.min(max, Math.max(min, Number.isNaN(number) ? 0 : number));
}

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');
}

function App() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [remaining, setRemaining] = useState(25 * 60);
  const [initialDuration, setInitialDuration] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const endAtRef = useRef(null);
  const audioRef = useRef(null);
  const alarmIntervalRef = useRef(null);

  const configuredDuration = hours * 3600 + minutes * 60 + seconds;
  const progress = initialDuration > 0 ? remaining / initialDuration : 1;

  function ensureAudio() {
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioRef.current.state === 'suspended') audioRef.current.resume();
  }

  function beep() {
    const context = audioRef.current;
    if (!context) return;
    [0, 0.22, 0.44].forEach((delay, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index === 1 ? 740 : 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + delay + 0.18);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(context.currentTime + delay);
      oscillator.stop(context.currentTime + delay + 0.2);
    });
  }

  function showFinished() {
    setRunning(false);
    setRemaining(0);
    setFinished(true);
    beep();
    alarmIntervalRef.current = window.setInterval(beep, 1800);
    document.title = '🔔 Время вышло!';
    if (window.desktopTimer) {
      window.desktopTimer.notifyFinished();
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Время вышло!', { body: 'Таймер завершён — пора сделать паузу.' });
    }
  }

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(next);
      document.title = `${formatTime(next)} — Таймер`;
      if (next === 0) {
        window.clearInterval(timer);
        showFinished();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => () => window.clearInterval(alarmIntervalRef.current), []);

  function start() {
    ensureAudio();
    if (!window.desktopTimer && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    let duration = remaining;
    if (!running && (remaining === 0 || remaining === initialDuration)) {
      duration = configuredDuration;
      setInitialDuration(duration);
      setRemaining(duration);
    }
    if (duration <= 0) return;
    endAtRef.current = Date.now() + duration * 1000;
    setRunning(true);
  }

  function pause() {
    setRunning(false);
    document.title = `${formatTime(remaining)} — Пауза`;
  }

  function reset() {
    setRunning(false);
    setFinished(false);
    const duration = configuredDuration;
    setInitialDuration(duration);
    setRemaining(duration);
    document.title = 'Тихий час — таймер';
    window.clearInterval(alarmIntervalRef.current);
  }

  function dismissAlarm() {
    setFinished(false);
    window.clearInterval(alarmIntervalRef.current);
    document.title = 'Тихий час — таймер';
  }

  function updateField(setter, value, max) {
    setter(clamp(value, 0, max));
  }

  const circleStyle = {
    background: `conic-gradient(var(--accent) ${progress * 360}deg, var(--track) 0deg)`,
  };

  return (
    <main className="page-shell">
      <header className="brand">
        <span className="brand-mark"><span /></span>
        <span>ТИХИЙ ЧАС</span>
      </header>

      <section className="timer-card" aria-label="Таймер обратного отсчёта">
        <div className={`timer-ring ${running ? 'is-running' : ''}`} style={circleStyle}>
          <div className="timer-face">
            <p className="eyebrow">{running ? 'ОСТАЛОСЬ' : remaining < initialDuration ? 'ПАУЗА' : 'ВАШЕ ВРЕМЯ'}</p>
            <time>{formatTime(remaining)}</time>
            <p className="status"><i className={running ? 'pulse' : ''} />{running ? 'Таймер идёт' : 'Готов к запуску'}</p>
          </div>
        </div>

        <div className="controls">
          <button className="primary" onClick={running ? pause : start} disabled={!running && remaining === 0 && configuredDuration === 0}>
            {running ? <Pause size={21} fill="currentColor" /> : <Play size={21} fill="currentColor" />}
            {running ? 'Пауза' : remaining < initialDuration && remaining > 0 ? 'Продолжить' : 'Запустить'}
          </button>
          <button className="icon-button" onClick={reset} aria-label="Сбросить таймер" title="Сбросить">
            <RotateCcw size={21} />
          </button>
        </div>
      </section>

      <section className="settings" aria-label="Установка времени">
        <div className="settings-heading">
          <div><p className="eyebrow">НАСТРОЙКА</p><h1>На сколько поставить?</h1></div>
          <Volume2 size={20} />
        </div>

        <div className="time-inputs">
          <label><input type="number" min="0" max={MAX_HOURS} value={hours} disabled={running} onChange={(e) => updateField(setHours, e.target.value, MAX_HOURS)} /><span>часов</span></label>
          <b>:</b>
          <label><input type="number" min="0" max="59" value={minutes} disabled={running} onChange={(e) => updateField(setMinutes, e.target.value, 59)} /><span>минут</span></label>
          <b>:</b>
          <label><input type="number" min="0" max="59" value={seconds} disabled={running} onChange={(e) => updateField(setSeconds, e.target.value, 59)} /><span>секунд</span></label>
        </div>

        <div className="presets">
          {[5, 15, 25, 45].map((value) => (
            <button key={value} disabled={running} onClick={() => { setHours(0); setMinutes(value); setSeconds(0); setRemaining(value * 60); setInitialDuration(value * 60); }}>
              {value} мин
            </button>
          ))}
        </div>
        <p className="hint">Можно свернуть окно — программа сама появится и напомнит, когда время закончится.</p>
      </section>

      {finished && (
        <div className="alarm-backdrop" role="alertdialog" aria-modal="true" aria-label="Время вышло">
          <div className="alarm-card">
            <button className="alarm-close" onClick={dismissAlarm} aria-label="Закрыть"><X /></button>
            <div className="bell"><BellRing size={38} /></div>
            <p className="eyebrow">ТАЙМЕР ЗАВЕРШЁН</p>
            <h2>Время вышло!</h2>
            <p>Готово. Можно выдохнуть, размяться<br />или перейти к следующему делу.</p>
            <button className="primary wide" onClick={dismissAlarm}>Понятно</button>
          </div>
        </div>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
