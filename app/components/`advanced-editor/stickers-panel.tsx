"use client"

import { useState } from "react"
import { Search, Smile, Heart, Star, Zap, Sun, Sparkles } from "lucide-react"

interface StickersPanelProps {
  onStickerAdd?: (sticker: any, size: number) => void
  onSelectSticker?: (emoji: string) => void
  onStickerSelect?: (emoji: string) => void
}

export function StickersPanel({ onStickerAdd, onSelectSticker, onStickerSelect }: StickersPanelProps) {
  const [activeCategory, setActiveCategory] = useState("faces")
  const [searchTerm, setSearchTerm] = useState("")
  const [stickerSize, setStickerSize] = useState(40)

  const stickerCategories = {
    faces: {
      name: "Faces",
      icon: <Smile size={16} />,
      stickers: [
        { emoji: "😀", name: "grinning" },
        { emoji: "😃", name: "smiley" },
        { emoji: "😄", name: "smile" },
        { emoji: "😁", name: "grin" },
        { emoji: "😆", name: "laughing" },
        { emoji: "😅", name: "sweat_smile" },
        { emoji: "🤣", name: "rofl" },
        { emoji: "😂", name: "joy" },
        { emoji: "🙂", name: "slightly_smiling" },
        { emoji: "🙃", name: "upside_down" },
        { emoji: "😉", name: "wink" },
        { emoji: "😊", name: "blush" },
        { emoji: "😇", name: "innocent" },
        { emoji: "🥰", name: "smiling_face_with_hearts" },
        { emoji: "😍", name: "heart_eyes" },
        { emoji: "🤩", name: "star_struck" },
        { emoji: "😘", name: "kissing_heart" },
        { emoji: "😗", name: "kissing" },
        { emoji: "😚", name: "kissing_closed_eyes" },
        { emoji: "😙", name: "kissing_smiling_eyes" },
        { emoji: "🥲", name: "smiling_face_with_tear" },
        { emoji: "😋", name: "yum" },
        { emoji: "😛", name: "stuck_out_tongue" },
        { emoji: "😜", name: "stuck_out_tongue_winking_eye" },
        { emoji: "🤪", name: "zany_face" },
        { emoji: "😝", name: "stuck_out_tongue_closed_eyes" },
        { emoji: "🤑", name: "money_mouth" },
        { emoji: "🤗", name: "hugging" },
        { emoji: "🤭", name: "hand_over_mouth" },
        { emoji: "🤫", name: "shushing" },
        { emoji: "🤔", name: "thinking" },
        { emoji: "🤐", name: "zipper_mouth" },
        { emoji: "🤨", name: "raised_eyebrow" },
        { emoji: "😐", name: "neutral" },
        { emoji: "😑", name: "expressionless" },
        { emoji: "😶", name: "no_mouth" },
        { emoji: "😏", name: "smirk" },
        { emoji: "😒", name: "unamused" },
        { emoji: "🙄", name: "eye_roll" },
        { emoji: "😬", name: "grimacing" },
        { emoji: "🤥", name: "lying" },
      ],
    },
    hearts: {
      name: "Hearts",
      icon: <Heart size={16} />,
      stickers: [
        { emoji: "❤️", name: "red_heart" },
        { emoji: "🧡", name: "orange_heart" },
        { emoji: "💛", name: "yellow_heart" },
        { emoji: "💚", name: "green_heart" },
        { emoji: "💙", name: "blue_heart" },
        { emoji: "💜", name: "purple_heart" },
        { emoji: "🖤", name: "black_heart" },
        { emoji: "🤍", name: "white_heart" },
        { emoji: "🤎", name: "brown_heart" },
        { emoji: "💔", name: "broken_heart" },
        { emoji: "❣️", name: "heart_exclamation" },
        { emoji: "💕", name: "two_hearts" },
        { emoji: "💞", name: "revolving_hearts" },
        { emoji: "💓", name: "heartbeat" },
        { emoji: "💗", name: "heartpulse" },
        { emoji: "💖", name: "sparkling_heart" },
        { emoji: "💘", name: "cupid" },
        { emoji: "💝", name: "gift_heart" },
        { emoji: "💟", name: "heart_decoration" },
        { emoji: "♥️", name: "heart_suit" },
      ],
    },
    nature: {
      name: "Nature",
      icon: <Sun size={16} />,
      stickers: [
        { emoji: "🌞", name: "sun_with_face" },
        { emoji: "🌝", name: "full_moon_with_face" },
        { emoji: "🌛", name: "first_quarter_moon_with_face" },
        { emoji: "🌜", name: "last_quarter_moon_with_face" },
        { emoji: "🌚", name: "new_moon_with_face" },
        { emoji: "🌕", name: "full_moon" },
        { emoji: "🌖", name: "waning_gibbous_moon" },
        { emoji: "🌗", name: "last_quarter_moon" },
        { emoji: "🌘", name: "waning_crescent_moon" },
        { emoji: "🌑", name: "new_moon" },
        { emoji: "🌒", name: "waxing_crescent_moon" },
        { emoji: "🌓", name: "first_quarter_moon" },
        { emoji: "🌔", name: "waxing_gibbous_moon" },
        { emoji: "🌙", name: "crescent_moon" },
        { emoji: "🌎", name: "earth_americas" },
        { emoji: "🌍", name: "earth_africa" },
        { emoji: "🌏", name: "earth_asia" },
        { emoji: "⭐", name: "star" },
        { emoji: "🌟", name: "star2" },
        { emoji: "💫", name: "dizzy" },
        { emoji: "✨", name: "sparkles" },
        { emoji: "☄️", name: "comet" },
        { emoji: "☀️", name: "sunny" },
        { emoji: "🌤️", name: "partly_sunny" },
        { emoji: "⛅", name: "partly_sunny" },
        { emoji: "🌦️", name: "partly_sunny_rain" },
        { emoji: "🌧️", name: "cloud_with_rain" },
        { emoji: "⛈️", name: "cloud_with_lightning_and_rain" },
        { emoji: "🌩️", name: "cloud_with_lightning" },
        { emoji: "🌨️", name: "cloud_with_snow" },
        { emoji: "❄️", name: "snowflake" },
        { emoji: "☃️", name: "snowman_with_snow" },
        { emoji: "⛄", name: "snowman" },
        { emoji: "🌬️", name: "wind_face" },
        { emoji: "💨", name: "dash" },
        { emoji: "🌪️", name: "tornado" },
        { emoji: "🌫️", name: "fog" },
        { emoji: "🌈", name: "rainbow" },
      ],
    },
    objects: {
      name: "Objects",
      icon: <Star size={16} />,
      stickers: [
        { emoji: "🎉", name: "tada" },
        { emoji: "🎊", name: "confetti_ball" },
        { emoji: "🎈", name: "balloon" },
        { emoji: "🎁", name: "gift" },
        { emoji: "🎀", name: "ribbon" },
        { emoji: "🎂", name: "birthday" },
        { emoji: "🍰", name: "cake" },
        { emoji: "🧁", name: "cupcake" },
        { emoji: "🍭", name: "lollipop" },
        { emoji: "🍬", name: "candy" },
        { emoji: "🍫", name: "chocolate_bar" },
        { emoji: "🍿", name: "popcorn" },
        { emoji: "🍩", name: "doughnut" },
        { emoji: "🍪", name: "cookie" },
        { emoji: "🎵", name: "musical_note" },
        { emoji: "🎶", name: "notes" },
        { emoji: "🎤", name: "microphone" },
        { emoji: "🎧", name: "headphones" },
        { emoji: "📱", name: "iphone" },
        { emoji: "💻", name: "computer" },
        { emoji: "⌨️", name: "keyboard" },
        { emoji: "🖥️", name: "desktop_computer" },
        { emoji: "🖨️", name: "printer" },
        { emoji: "📷", name: "camera" },
        { emoji: "📸", name: "camera_flash" },
        { emoji: "🔍", name: "mag" },
        { emoji: "💡", name: "bulb" },
        { emoji: "🔦", name: "flashlight" },
        { emoji: "🕯️", name: "candle" },
        { emoji: "🪔", name: "diya_lamp" },
        { emoji: "🏆", name: "trophy" },
        { emoji: "🥇", name: "first_place_medal" },
        { emoji: "🥈", name: "second_place_medal" },
        { emoji: "🥉", name: "third_place_medal" },
        { emoji: "🏅", name: "medal_sports" },
        { emoji: "🎖️", name: "medal_military" },
        { emoji: "👑", name: "crown" },
        { emoji: "💎", name: "gem" },
      ],
    },
    activities: {
      name: "Activities",
      icon: <Zap size={16} />,
      stickers: [
        { emoji: "⚽", name: "soccer" },
        { emoji: "🏀", name: "basketball" },
        { emoji: "🏈", name: "football" },
        { emoji: "⚾", name: "baseball" },
        { emoji: "🥎", name: "softball" },
        { emoji: "🎾", name: "tennis" },
        { emoji: "🏐", name: "volleyball" },
        { emoji: "🏉", name: "rugby_football" },
        { emoji: "🥏", name: "flying_disc" },
        { emoji: "🎱", name: "8ball" },
        { emoji: "🪀", name: "yo_yo" },
        { emoji: "🏓", name: "ping_pong" },
        { emoji: "🏸", name: "badminton" },
        { emoji: "🥅", name: "goal_net" },
        { emoji: "⛳", name: "golf" },
        { emoji: "🪁", name: "kite" },
        { emoji: "🏹", name: "bow_and_arrow" },
        { emoji: "🎣", name: "fishing_pole_and_fish" },
        { emoji: "🤿", name: "diving_mask" },
        { emoji: "🥊", name: "boxing_glove" },
        { emoji: "🥋", name: "martial_arts_uniform" },
        { emoji: "🎽", name: "running_shirt_with_sash" },
        { emoji: "🛹", name: "skateboard" },
        { emoji: "🛷", name: "sled" },
        { emoji: "⛸️", name: "ice_skate" },
        { emoji: "🥌", name: "curling_stone" },
        { emoji: "🎿", name: "ski" },
        { emoji: "⛷️", name: "skier" },
        { emoji: "🏂", name: "snowboarder" },
        { emoji: "🪂", name: "parachute" },
        { emoji: "🏋️‍♀️", name: "weight_lifting_woman" },
        { emoji: "🏋️‍♂️", name: "weight_lifting_man" },
        { emoji: "🤸‍♀️", name: "woman_cartwheeling" },
        { emoji: "🤸‍♂️", name: "man_cartwheeling" },
        { emoji: "⛹️‍♀️", name: "woman_bouncing_ball" },
        { emoji: "⛹️‍♂️", name: "man_bouncing_ball" },
        { emoji: "🤺", name: "person_fencing" },
        { emoji: "🤾‍♀️", name: "woman_playing_handball" },
      ],
    },
    symbols: {
      name: "Symbols",
      icon: <Sparkles size={16} />,
      stickers: [
        { emoji: "💯", name: "100" },
        { emoji: "💢", name: "anger" },
        { emoji: "💥", name: "boom" },
        { emoji: "💫", name: "dizzy" },
        { emoji: "💦", name: "sweat_drops" },
        { emoji: "💨", name: "dash" },
        { emoji: "🕳️", name: "hole" },
        { emoji: "💣", name: "bomb" },
        { emoji: "💬", name: "speech_balloon" },
        { emoji: "👁️‍🗨️", name: "eye_speech_bubble" },
        { emoji: "🗨️", name: "left_speech_bubble" },
        { emoji: "🗯️", name: "right_anger_bubble" },
        { emoji: "💭", name: "thought_balloon" },
        { emoji: "💤", name: "zzz" },
        { emoji: "👋", name: "wave" },
        { emoji: "🤚", name: "raised_back_of_hand" },
        { emoji: "🖐️", name: "raised_hand_with_fingers_splayed" },
        { emoji: "✋", name: "hand" },
        { emoji: "🖖", name: "vulcan_salute" },
        { emoji: "👌", name: "ok_hand" },
        { emoji: "🤌", name: "pinched_fingers" },
        { emoji: "🤏", name: "pinching_hand" },
        { emoji: "✌️", name: "v" },
        { emoji: "🤞", name: "crossed_fingers" },
        { emoji: "🤟", name: "love_you_gesture" },
        { emoji: "🤘", name: "metal" },
        { emoji: "🤙", name: "call_me_hand" },
        { emoji: "👈", name: "point_left" },
        { emoji: "👉", name: "point_right" },
        { emoji: "👆", name: "point_up_2" },
        { emoji: "🖕", name: "middle_finger" },
        { emoji: "👇", name: "point_down" },
        { emoji: "☝️", name: "point_up" },
        { emoji: "👍", name: "thumbsup" },
        { emoji: "👎", name: "thumbsdown" },
        { emoji: "✊", name: "fist" },
        { emoji: "👊", name: "facepunch" },
        { emoji: "🤛", name: "fist_left" },
        { emoji: "🤜", name: "fist_right" },
      ],
    },
  }

  const handleStickerClick = (sticker: any) => {
    // Call all possible callback functions
    onStickerAdd?.(sticker, stickerSize)
    onSelectSticker?.(sticker.emoji)
    onStickerSelect?.(sticker.emoji)
  }

  const filteredStickers = stickerCategories[activeCategory as keyof typeof stickerCategories].stickers.filter(
    (sticker) => sticker.name.toLowerCase().includes(searchTerm.toLowerCase()) || sticker.emoji.includes(searchTerm),
  )

  return (
    <div
      style={{
        background: "rgba(0,0,0,0.9)",
        padding: "1rem",
        borderRadius: "1rem",
        color: "white",
        maxHeight: "600px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <Smile size={20} />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "600" }}>Stickers & Emojis</h3>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: "1rem" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "0.75rem",
            top: "50%",
            transform: "translateY(-50%)",
            color: "rgba(255,255,255,0.5)",
          }}
        />
        <input
          type="text"
          placeholder="Search stickers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 0.75rem 0.75rem 2.5rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.1)",
            color: "white",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
      </div>

      {/* Size Control */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <label style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)" }}>Sticker Size</label>
          <span style={{ fontSize: "0.8rem", color: "white" }}>{stickerSize}px</span>
        </div>
        <input
          type="range"
          min={20}
          max={80}
          value={stickerSize}
          onChange={(e) => setStickerSize(Number(e.target.value))}
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.2)",
            outline: "none",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Categories */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1rem",
          overflowX: "auto",
          paddingBottom: "0.5rem",
        }}
      >
        {Object.entries(stickerCategories).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              border: activeCategory === key ? "2px solid #10B981" : "1px solid rgba(255,255,255,0.2)",
              background: activeCategory === key ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.1)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: "500",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {category.icon}
            {category.name}
          </button>
        ))}
      </div>

      {/* Stickers Grid */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(50px, 1fr))",
          gap: "0.5rem",
          padding: "0.5rem",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "0.5rem",
        }}
      >
        {filteredStickers.map((sticker, index) => (
          <button
            key={index}
            onClick={() => handleStickerClick(sticker)}
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.1)",
              cursor: "pointer",
              fontSize: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s ease",
              aspectRatio: "1",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.2)"
              e.currentTarget.style.transform = "scale(1.1)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)"
              e.currentTarget.style.transform = "scale(1)"
            }}
            title={sticker.name}
          >
            {sticker.emoji}
          </button>
        ))}
      </div>

      {filteredStickers.length === 0 && (
        <div
          style={{
            textAlign: "center",
            color: "rgba(255,255,255,0.6)",
            padding: "2rem",
            fontSize: "0.9rem",
          }}
        >
          No stickers found for "{searchTerm}"
        </div>
      )}
    </div>
  )
}
