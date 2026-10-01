package pe.ebyzom.lumen.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.sqlite.db.SupportSQLiteDatabase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import pe.ebyzom.lumen.model.Script

@Database(entities = [Script::class], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun scriptDao(): ScriptDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "lumen-db"
                )
                    .fallbackToDestructiveMigration()
                    .addCallback(object : RoomDatabase.Callback() {
                        override fun onCreate(db: SupportSQLiteDatabase) {
                            super.onCreate(db)
                            CoroutineScope(Dispatchers.IO).launch {
                                INSTANCE?.scriptDao()?.let { dao ->
                                    dao.insertScript(
                                        Script(
                                            title = "Discurso de Bienvenida",
                                            content = """Buenos días a todos. Es un verdadero honor estar aquí hoy con ustedes.

Durante los últimos años, nuestro equipo se propuso resolver una sola pregunta: ¿cómo transformamos la manera en que nos comunicamos con el mundo?

Hoy venimos a presentar una herramienta diseñada con velocidad instantánea, máxima claridad visual y control absoluto de lectura.

Cada línea de texto y cada ajuste fueron creados pensando en un solo objetivo: que tu mensaje sea claro, fluido y natural frente a la cámara.

Muchas gracias.""".trimIndent(),
                                            wpm = 130,
                                            fontSize = 44
                                        )
                                    )
                                    dao.insertScript(
                                        Script(
                                            title = "Presentación de Proyecto",
                                            content = """Hola a todos, bienvenidos. Hoy les presento los resultados de nuestro último proyecto.

En este periodo logramos optimizar los tiempos de producción y alcanzar los objetivos propuestos.

Agradezco a todos los participantes por su dedicación y esfuerzo continuo. Quedo atento a sus dudas y comentarios.""".trimIndent(),
                                            wpm = 140,
                                            fontSize = 44
                                        )
                                    )
                                }
                            }
                        }
                    })
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
