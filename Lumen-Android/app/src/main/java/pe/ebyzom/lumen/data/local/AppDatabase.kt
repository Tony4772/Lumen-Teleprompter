package pe.ebyzom.lumen.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import pe.ebyzom.lumen.model.Script

@Database(entities = [Script::class], version = 1)
abstract class AppDatabase : RoomDatabase() {
    abstract fun scriptDao(): ScriptDao
}
