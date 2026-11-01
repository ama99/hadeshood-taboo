import React, { useState, useMemo } from 'react';
import {
  X,
  HelpCircle,
  BookOpen,
  Search,
  PlusCircle,
  User,
  Sparkles,
  Ban,
  Check,
} from 'lucide-react';
import { translations, formatNumber } from '../i18n/translations';
import type { CardCategory, TabooCard } from '../data/cards';
import type { DiscordUserProfile, Language } from '../types/game';
import { AVATAR_PRESETS, getSafeAvatarUrl } from '../utils/avatars';
import { soundFX } from '../utils/sound';

export const RulesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}> = ({ isOpen, onClose, lang }) => {
  if (!isOpen) return null;
  const t = translations[lang];

  const steps = [
    { title: t.rulesStep1Title, desc: t.rulesStep1Desc, color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300' },
    { title: t.rulesStep2Title, desc: t.rulesStep2Desc, color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-300' },
    { title: t.rulesStep3Title, desc: t.rulesStep3Desc, color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-300' },
    { title: t.rulesStep4Title, desc: t.rulesStep4Desc, color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-300' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl animate-card-pop max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-black text-white">{t.rulesTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-gradient-to-r border ${s.color}`}
            >
              <h4 className="font-extrabold text-sm sm:text-base mb-1">{s.title}</h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CustomCardModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onAddCard: (word: string, forbiddenWords: string[]) => void;
}> = ({ isOpen, onClose, lang, onAddCard }) => {
  const t = translations[lang];
  const [word, setWord] = useState('');
  const [forbiddenInput, setForbiddenInput] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWord = word.trim();
    const forbidden = forbiddenInput
      .split(/[،,؛;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (!cleanWord || forbidden.length === 0) return;
    soundFX.playCorrect();
    onAddCard(cleanWord, forbidden);
    setWord('');
    setForbiddenInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl animate-card-pop">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black text-white">{t.addCustomCardTitle}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t.customWordLabel}
            </label>
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              placeholder={t.customWordPlaceholder}
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t.customForbiddenLabel}
            </label>
            <textarea
              rows={3}
              value={forbiddenInput}
              onChange={(e) => setForbiddenInput(e.target.value)}
              placeholder={t.customForbiddenPlaceholder}
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-rose-400"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {t.addCardSubmit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const DeckBrowserModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  cards: TabooCard[];
  onOpenCustomCard: () => void;
}> = ({ isOpen, onClose, lang, cards, onOpenCustomCard }) => {
  const t = translations[lang];
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<CardCategory>('all');

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (selectedCat !== 'all' && c.category !== selectedCat) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return (
        c.word.toLowerCase().includes(q) ||
        c.forbiddenWords.some((fw) => fw.toLowerCase().includes(q))
      );
    });
  }, [cards, selectedCat, search]);

  if (!isOpen) return null;

  const categories: CardCategory[] = [
    'all',
    'memes',
    'food',
    'everyday',
    'proverbs',
    'pop',
    'tech',
    'places',
    'general',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-4xl bg-slate-900 border border-white/15 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[90vh] animate-card-pop">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                <span>{t.deckBrowser}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {formatNumber(filteredCards.length, lang)}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                src/data/cards.txt • کلمه اصلی : کلمه ممنوع ۱، ۲، ۳، ۴، ۵، ۶
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenCustomCard();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-bold cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.customCardBtn}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="my-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'fa'
                  ? 'جستجو در بین کلمات، میم‌ها، ضرب‌المثل‌ها و کلمات ممنوعه...'
                  : 'Search words or forbidden terms...'
              }
              className="w-full bg-slate-950 border border-white/10 rounded-xl ps-10 pe-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedCat === cat
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-white/10'
                }`}
              >
                {t.categories[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pe-1">
          {filteredCards.map((c) => (
            <div
              key={c.id}
              className="bg-slate-950/90 border border-white/10 hover:border-cyan-500/40 rounded-2xl p-3.5 flex flex-col justify-between transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h4 className="font-black text-base text-cyan-300">{c.word}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 shrink-0">
                    {t.categories[c.category]?.split(' ').slice(0, 2).join(' ')}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.forbiddenWords.map((fw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs"
                    >
                      <Ban className="w-2.5 h-2.5 text-rose-400" />
                      {fw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const EditProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  profile: DiscordUserProfile;
  onSaveProfile: (displayName: string, avatarUrl: string) => void;
}> = ({ isOpen, onClose, lang, profile, onSaveProfile }) => {
  const t = translations[lang];
  const [name, setName] = useState(profile.displayName);
  const [avatar, setAvatar] = useState(getSafeAvatarUrl(profile.avatarUrl, 0));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    soundFX.playClick();
    onSaveProfile(name.trim(), avatar);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl animate-card-pop">
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-black text-white">{t.editProfile}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center mb-2">
            <img
              src={getSafeAvatarUrl(avatar, 0)}
              alt=""
              onError={(e) => {
                e.currentTarget.src = AVATAR_PRESETS[0];
              }}
              className="w-20 h-20 rounded-full border-2 border-cyan-400 bg-slate-800 shadow-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {lang === 'fa' ? 'نام نمایشی شما در بازی' : 'Display Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              {lang === 'fa' ? 'انتخاب آواتار' : 'Choose Avatar'}
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_PRESETS.map((presetUrl, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => setAvatar(presetUrl)}
                  className={`relative p-1 rounded-2xl border-2 transition cursor-pointer flex items-center justify-center bg-slate-950 ${
                    avatar === presetUrl
                      ? 'border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={presetUrl} alt="" className="w-12 h-12 rounded-full" />
                  {avatar === presetUrl && (
                    <span className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'fa' ? 'ذخیره پروفایل' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
