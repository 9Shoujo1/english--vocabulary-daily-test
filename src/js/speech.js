class SpeechService {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.isSpeaking = false;
    }

    isSupported() {
        return 'speechSynthesis' in window && this.synthesis !== null;
    }

    speak(word, options = {}) {
        if (!this.isSupported()) {
            console.warn('浏览器不支持 Web Speech API');
            return false;
        }

        // 停止当前正在播放的语音
        this.stop();

        const utterance = new SpeechSynthesisUtterance(word);
        
        // 设置语言为英语
        utterance.lang = options.lang || 'en-US';
        
        // 设置语速（默认0.8，更慢更清晰，范围0.1-10）
        utterance.rate = options.rate || 0.8;
        
        // 设置音调（默认0.85，更低更柔和，范围0-2）
        utterance.pitch = options.pitch || 0.85;
        
        // 设置音量（默认0.9，稍低一点避免过响，范围0-1）
        utterance.volume = options.volume || 0.9;

        // 尝试设置更好的英语语音
        const voices = this.getVoices();
        if (voices.length > 0) {
            // 优先选择美国英语，优先选择本地服务
            const preferredVoice = voices.find(voice => 
                voice.lang === 'en-US' && voice.localService && !voice.name.includes('Enhanced')
            ) || voices.find(voice => 
                voice.lang === 'en-GB' && voice.localService && !voice.name.includes('Enhanced')
            ) || voices.find(voice => 
                voice.lang.startsWith('en') && voice.localService
            ) || voices.find(voice => 
                voice.lang.startsWith('en')
            );
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
        }

        // 事件监听
        utterance.onstart = () => {
            this.isSpeaking = true;
            if (options.onStart) {
                options.onStart();
            }
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            if (options.onEnd) {
                options.onEnd();
            }
        };

        utterance.onerror = (event) => {
            this.isSpeaking = false;
            console.error('语音合成错误:', event.error);
            if (options.onError) {
                options.onError(event.error);
            }
        };

        this.synthesis.speak(utterance);
        return true;
    }

    stop() {
        if (this.synthesis && this.isSpeaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
        }
    }

    pause() {
        if (this.synthesis && !this.synthesis.paused) {
            this.synthesis.pause();
        }
    }

    resume() {
        if (this.synthesis && this.synthesis.paused) {
            this.synthesis.resume();
        }
    }

    getVoices() {
        if (!this.isSupported()) {
            return [];
        }
        return this.synthesis.getVoices();
    }

    getEnglishVoices() {
        const voices = this.getVoices();
        return voices.filter(voice => 
            voice.lang.startsWith('en') || 
            voice.lang === 'en-US' || 
            voice.lang === 'en-GB'
        );
    }

    setVoice(voiceUri) {
        // Web Speech API 的 voice 设置在 speak 方法中无法直接修改
        // 这个方法保留用于未来可能的扩展
        console.log('设置语音:', voiceUri);
    }
}