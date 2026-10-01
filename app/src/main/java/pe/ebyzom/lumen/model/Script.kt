package pe.ebyzom.lumen.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "scripts")
data class Script(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val title: String,
    val content: String,
    val wpm: Int = 135,
    val fontSize: Int = 48,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)
